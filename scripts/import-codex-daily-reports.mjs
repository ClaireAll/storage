import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_REPORT_TABLE = "codex_daily_reports";
export const DEFAULT_REPORT_CATEGORY = 10000;

const reportCategories = [
  { value: 1, keywords: ["fx-data-web", "fv-web2"] },
  { value: 2, keywords: ["skills"] },
  { value: 3, keywords: ["chrome-plugin"] },
  { value: 4, keywords: ["storage"] },
  { value: 5, keywords: ["2026"] },
  { value: 6, keywords: ["money-tool"] },
  { value: 7, keywords: ["fd-biz"] },
];

function loadLocalEnv() {
  try {
    const envText = readFileSync(".env.local", "utf8");

    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);

      if (!match || process.env[match[1]]) {
        continue;
      }

      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // The script can also run with environment variables supplied directly.
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }

  return value;
}

function readArgValue(args, name) {
  const index = args.indexOf(name);

  if (index < 0) {
    return "";
  }

  return args[index + 1]?.trim() ?? "";
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(date);
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toCategory(value) {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : DEFAULT_REPORT_CATEGORY;
}

export function resolveCodexReportCategory({ cwd = "", title = "" } = {}) {
  const target = `${cwd} ${title}`.toLowerCase().replaceAll("\\", "/");
  const matchedCategory = reportCategories.find(({ keywords }) =>
    keywords.some((keyword) => target.includes(keyword)),
  );

  return matchedCategory?.value ?? DEFAULT_REPORT_CATEGORY;
}

export function normalizeCodexDailyReportEntries(rawEntries, fallbackDate) {
  if (!Array.isArray(rawEntries)) {
    throw new Error("日报数据必须是数组");
  }

  return rawEntries
    .map((entry) => {
      const date = toText(entry.date) || fallbackDate;

      if (!isValidDate(date)) {
        throw new Error(`日期格式不正确：${date}`);
      }

      const threadTitle = toText(
        entry.thread_title ?? entry.threadTitle ?? entry.title,
      );
      const userTasks = toText(
        entry.user_tasks ?? entry.userTasks ?? entry.user,
      );
      const assistantSumma = toText(
        entry.assistant_summa ??
          entry.assistant_summary ??
          entry.assistantSummary ??
          entry.answerSummary,
      );

      return {
        assistant_summa: assistantSumma,
        category:
          typeof entry.category === "number" && Number.isInteger(entry.category)
            ? entry.category
            : resolveCodexReportCategory({
                cwd: toText(entry.cwd),
                title: threadTitle,
              }),
        date,
        thread_title: threadTitle || "未命名任务",
        user_tasks: userTasks,
      };
    })
    .filter((entry) => entry.user_tasks || entry.assistant_summa);
}

export async function saveCodexDailyReports({
  date,
  entries,
  ownerId,
  supabase,
  table = DEFAULT_REPORT_TABLE,
}) {
  if (!ownerId) {
    throw new Error("缺少日报所属用户 id");
  }

  const normalizedEntries = entries.map((entry) => ({
    assistant_summa: toText(entry.assistant_summa),
    category: toCategory(entry.category),
    date: entry.date || date,
    id: ownerId,
    thread_title: toText(entry.thread_title) || "未命名任务",
    user_tasks: toText(entry.user_tasks),
  }));

  if (normalizedEntries.length === 0) {
    return { inserted: 0 };
  }

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("id", ownerId)
    .eq("date", date);

  if (deleteError) {
    throw new Error(`清理当天日报失败：${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert(normalizedEntries);

  if (insertError) {
    throw new Error(`写入当天日报失败：${insertError.message}`);
  }

  return { inserted: normalizedEntries.length };
}

function readEntries(path) {
  if (!path) {
    throw new Error("请通过 --entries 指定日报 JSON 文件");
  }

  const payload = JSON.parse(readFileSync(path, "utf8"));

  return Array.isArray(payload) ? payload : payload.entries;
}

function createSupabaseAdminClient() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function resolveOwnerId(supabase, explicitOwnerId) {
  if (explicitOwnerId) {
    return explicitOwnerId;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .limit(2);

  if (error) {
    throw new Error(`读取用户失败：${error.message}`);
  }

  if (data?.length === 1 && data[0]?.id) {
    return data[0].id;
  }

  throw new Error(
    "无法自动确认日报所属用户，请在 .env.local 中配置 CODEX_DAILY_USER_ID",
  );
}

async function main() {
  loadLocalEnv();

  const args = process.argv.slice(2);
  const date = readArgValue(args, "--date") || getShanghaiDate();
  const entriesPath = readArgValue(args, "--entries");
  const table =
    readArgValue(args, "--table") ||
    process.env.CODEX_DAILY_REPORT_TABLE?.trim() ||
    DEFAULT_REPORT_TABLE;

  if (!isValidDate(date)) {
    throw new Error(`日期格式不正确：${date}`);
  }

  const supabase = createSupabaseAdminClient();
  const ownerId = await resolveOwnerId(
    supabase,
    process.env.CODEX_DAILY_USER_ID?.trim(),
  );
  const entries = normalizeCodexDailyReportEntries(readEntries(entriesPath), date);
  const result = await saveCodexDailyReports({
    date,
    entries,
    ownerId,
    supabase,
    table,
  });

  console.log(`Codex 日报已写入 ${result.inserted} 条`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
