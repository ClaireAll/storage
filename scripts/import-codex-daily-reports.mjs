import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_REPORT_TABLE = "codex_log";
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

function getCodexDailyReportFingerprint(entry) {
  return [
    entry.thread_title,
    entry.user_tasks,
    entry.assistant_summary,
  ]
    .map((value) => toText(value).replace(/\s+/g, " ").trim())
    .join("\u0001");
}

function toExplicitTokenCount(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : 0;

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.trunc(numericValue));
}

function getTokenEstimateSource(entry = {}) {
  const rawSource = toText(
    entry.token_basis ??
      entry.tokenBasis ??
      entry.raw_turn_text ??
      entry.rawTurnText ??
      entry.source_text ??
      entry.sourceText,
  );

  if (rawSource) {
    return { kind: "raw", text: rawSource };
  }

  return {
    kind: "summary",
    text: [
      entry.thread_title,
      entry.user_tasks,
      entry.assistant_summary || entry.assistant_summa,
    ]
      .map(toText)
      .filter(Boolean)
      .join("\n"),
  };
}

export function estimateCodexLogTokenCount({
  assistant_summary = "",
  assistant_summa = "",
  raw_turn_text = "",
  rawTurnText = "",
  source_text = "",
  sourceText = "",
  token_basis = "",
  tokenBasis = "",
  thread_title = "",
  user_tasks = "",
} = {}) {
  const { kind, text } = getTokenEstimateSource({
    assistant_summary,
    assistant_summa,
    raw_turn_text,
    rawTurnText,
    source_text,
    sourceText,
    thread_title,
    token_basis,
    tokenBasis,
    user_tasks,
  });

  if (!text) {
    return 0;
  }

  const compactText = text.replace(/\s/g, "");
  const cjkCount = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinSegments = text.match(/[A-Za-z0-9_./:-]+/g) ?? [];
  const latinCharCount = latinSegments.join("").length;
  const symbolCount = Math.max(
    0,
    Array.from(compactText).length - cjkCount - latinCharCount,
  );
  const visibleTokenEstimate = Math.ceil(
    cjkCount * 1.1 + latinSegments.length * 1.3 + symbolCount * 0.5,
  );
  const contextMultiplier = kind === "raw" ? 2.4 : 8;

  return Math.max(800, Math.ceil(visibleTokenEstimate * contextMultiplier + 600));
}

function resolveTokenCount(entry) {
  const explicitTokenCount = toExplicitTokenCount(
    entry.token_count ?? entry.tokenCount ?? entry.tokens,
  );

  return explicitTokenCount ?? estimateCodexLogTokenCount(entry);
}

function normalizeMatchText(value) {
  return toText(value).replaceAll("\\", "/").replace(/\s+/g, " ").toLowerCase();
}

function getEntryThreadId(entry) {
  return toText(
    entry.codex_thread_id ??
      entry.codexThreadId ??
      entry.thread_id ??
      entry.threadId,
  );
}

function getDesktopThreadKey({ cwd = "", title = "" } = {}) {
  return `${normalizeMatchText(cwd)}\u0001${normalizeMatchText(title)}`;
}

function normalizeDesktopUsageThread(thread) {
  const tokensUsed = toExplicitTokenCount(
    thread.tokens_used ?? thread.tokensUsed ?? thread.token_count,
  );

  return {
    cwd: toText(thread.cwd),
    id: toText(thread.id),
    title: toText(thread.title ?? thread.thread_title),
    tokens_used: tokensUsed ?? 0,
  };
}

export function applyCodexDesktopUsageTokenCounts(entries, desktopThreads = []) {
  const normalizedThreads = desktopThreads
    .map(normalizeDesktopUsageThread)
    .filter((thread) => thread.tokens_used > 0);
  const threadsById = new Map(
    normalizedThreads
      .filter((thread) => thread.id)
      .map((thread) => [thread.id, thread]),
  );
  const threadsByKey = new Map(
    normalizedThreads
      .filter((thread) => thread.cwd && thread.title)
      .map((thread) => [getDesktopThreadKey(thread), thread]),
  );
  const matchedThreads = entries.map((entry) => {
    const threadId = getEntryThreadId(entry);

    if (threadId && threadsById.has(threadId)) {
      return threadsById.get(threadId);
    }

    return threadsByKey.get(
      getDesktopThreadKey({
        cwd: entry.cwd,
        title: entry.thread_title ?? entry.threadTitle ?? entry.title,
      }),
    );
  });
  const matchedCountByThreadId = new Map();

  matchedThreads.forEach((thread) => {
    if (!thread) {
      return;
    }

    const key = thread.id || getDesktopThreadKey(thread);
    matchedCountByThreadId.set(key, (matchedCountByThreadId.get(key) ?? 0) + 1);
  });

  const assignedCountByThreadId = new Map();

  return entries.map((entry, index) => {
    const thread = matchedThreads[index];

    if (!thread) {
      return entry;
    }

    const key = thread.id || getDesktopThreadKey(thread);
    const matchedCount = matchedCountByThreadId.get(key) ?? 1;
    const assignedCount = assignedCountByThreadId.get(key) ?? 0;
    const baseTokenCount = Math.floor(thread.tokens_used / matchedCount);
    const remainder = thread.tokens_used % matchedCount;
    const tokenCount =
      baseTokenCount + (assignedCount < remainder ? 1 : 0);

    assignedCountByThreadId.set(key, assignedCount + 1);

    return {
      ...entry,
      token_count: tokenCount,
    };
  });
}

function getDefaultCodexStatePath() {
  return (
    process.env.CODEX_STATE_DB_PATH?.trim() ||
    join(process.env.CODEX_HOME?.trim() || join(homedir(), ".codex"), "state_5.sqlite")
  );
}

function getSqliteExecutable() {
  const candidates = [
    process.env.CODEX_SQLITE3_PATH?.trim(),
    "D:\\software\\adb\\platform-tools\\sqlite3.exe",
    "sqlite3",
  ].filter(Boolean);

  return candidates.find((candidate) => {
    if (candidate === "sqlite3") {
      return true;
    }

    return existsSync(candidate);
  });
}

export function parseCodexDesktopUsageRows(output) {
  return toText(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id = "", title = "", cwd = "", tokensUsed = "0"] = line.split("\t");

      return normalizeDesktopUsageThread({
        cwd,
        id,
        title,
        tokens_used: tokensUsed,
      });
    })
    .filter((thread) => thread.tokens_used > 0);
}

export function readCodexDesktopUsageThreads({ date, sqlitePath, statePath } = {}) {
  const targetStatePath = statePath || getDefaultCodexStatePath();
  const sqlite = sqlitePath || getSqliteExecutable();

  if (!sqlite || !existsSync(targetStatePath)) {
    return [];
  }

  const dateClause = isValidDate(date)
    ? ` and date(updated_at, 'unixepoch', 'localtime')='${date}'`
    : "";
  const sql = [
    ".mode tabs",
    "select id, title, cwd, tokens_used",
    "from threads",
    `where tokens_used > 0${dateClause}`,
    "order by tokens_used desc;",
  ].join("\n");

  try {
    return parseCodexDesktopUsageRows(
      execFileSync(sqlite, [targetStatePath, sql], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    return [];
  }
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
        assistant_summary: assistantSumma,
        category:
          typeof entry.category === "number" && Number.isInteger(entry.category)
            ? entry.category
            : resolveCodexReportCategory({
                cwd: toText(entry.cwd),
                title: threadTitle,
              }),
        date,
        thread_title: threadTitle || "未命名任务",
        token_count: resolveTokenCount({
          ...entry,
          assistant_summary: assistantSumma,
          thread_title: threadTitle,
          user_tasks: userTasks,
        }),
        user_tasks: userTasks,
      };
    })
    .filter((entry) => entry.user_tasks || entry.assistant_summary);
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

  const normalizedEntries = entries.map((entry) => {
    const assistantSummary = toText(
      entry.assistant_summary ?? entry.assistant_summa,
    );
    const threadTitle = toText(entry.thread_title) || "未命名任务";
    const userTasks = toText(entry.user_tasks);

    return {
      assistant_summary: assistantSummary,
      category: toCategory(entry.category),
      date: entry.date || date,
      id: ownerId,
      thread_title: threadTitle,
      token_count: resolveTokenCount({
        ...entry,
        assistant_summary: assistantSummary,
        thread_title: threadTitle,
        user_tasks: userTasks,
      }),
      user_tasks: userTasks,
    };
  });

  if (normalizedEntries.length === 0) {
    return { inserted: 0 };
  }

  const { data: existingEntries, error: selectError } = await supabase
    .from(table)
    .select("r_id,thread_title,user_tasks,assistant_summary,token_count")
    .eq("id", ownerId)
    .eq("date", date);

  if (selectError) {
    throw new Error(`读取当天日报失败：${selectError.message}`);
  }

  const existingEntryByFingerprint = new Map(
    (existingEntries ?? []).map((entry) => [
      getCodexDailyReportFingerprint(entry),
      entry,
    ]),
  );
  const rowsToInsert = normalizedEntries.filter(
    (entry) => !existingEntryByFingerprint.has(getCodexDailyReportFingerprint(entry)),
  );
  const rowsToUpdate = normalizedEntries
    .map((entry) => {
      const existingEntry = existingEntryByFingerprint.get(
        getCodexDailyReportFingerprint(entry),
      );

      if (
        !existingEntry?.r_id ||
        toExplicitTokenCount(existingEntry.token_count) === entry.token_count
      ) {
        return null;
      }

      return {
        r_id: existingEntry.r_id,
        token_count: entry.token_count,
      };
    })
    .filter(Boolean);

  for (const row of rowsToUpdate) {
    const { error: updateError } = await supabase
      .from(table)
      .update({ token_count: row.token_count })
      .eq("r_id", row.r_id);

    if (updateError) {
      throw new Error(`更新日报 token 失败：${updateError.message}`);
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from(table)
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`写入新增日报失败：${insertError.message}`);
    }
  }

  return { inserted: rowsToInsert.length, updated: rowsToUpdate.length };
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
  const rawEntries = readEntries(entriesPath);
  const entries = normalizeCodexDailyReportEntries(
    applyCodexDesktopUsageTokenCounts(
      rawEntries,
      readCodexDesktopUsageThreads({ date }),
    ),
    date,
  );
  const result = await saveCodexDailyReports({
    date,
    entries,
    ownerId,
    supabase,
    table,
  });

  console.log(
    `Codex 日报已写入 ${result.inserted} 条，更新 ${result.updated ?? 0} 条`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
