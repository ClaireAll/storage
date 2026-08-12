import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const defaultSummaryModel = "codex:gpt-5+human-writing";

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
    // Environment variables can be supplied directly by the automation.
  }
}

function readArgument(args, name) {
  const index = args.indexOf(name);

  return index >= 0 ? args[index + 1] : "";
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Keeps historical automation job rows out of human-facing daily reports. */
export function isDailyReportLogRecord(record) {
  const threadTitle = toText(record?.thread_title);
  const userTasks = toText(record?.user_tasks);

  return !(
    threadTitle.startsWith("Automation:") ||
    userTasks.startsWith("Automation:")
  );
}

function toTokenCount(value) {
  const amount = Number(value);

  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function getSessionCount(entries) {
  const sessionKeys = new Set();

  entries.forEach((entry, index) => {
    const threadId = toText(
      entry?.codex_thread_id ?? entry?.codexThreadId ?? entry?.thread_id,
    );

    sessionKeys.add(threadId || `entry-${index}`);
  });

  return sessionKeys.size;
}

function requireSummary(summary) {
  const result = {
    growth: toText(summary?.growth),
    shortage: toText(summary?.shortage),
    summary: toText(summary?.summary),
  };

  if (!result.summary || !result.growth || !result.shortage) {
    throw new Error("日报总结必须包含 summary、growth 和 shortage");
  }

  return result;
}

/** Builds the cache row only after the corresponding daily log records exist. */
export function buildCodexDailyReport({
  date,
  entries,
  generatedAt,
  records,
  summary,
  summaryModel = defaultSummaryModel,
  userId,
}) {
  if (!records.length) {
    return null;
  }

  const safeSummary = requireSummary(summary);

  return {
    date,
    desktop_token_total: records.reduce(
      (total, record) => total + toTokenCount(record.token_count),
      0,
    ),
    growth: safeSummary.growth,
    id: userId,
    session_count: getSessionCount(entries),
    shortage: safeSummary.shortage,
    summary: safeSummary.summary,
    summary_generated_at: generatedAt,
    summary_model: toText(summaryModel) || defaultSummaryModel,
    token_calculated_at: generatedAt,
  };
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function resolveOwnerId(supabase, ownerId) {
  if (ownerId) {
    return ownerId;
  }

  const { data, error } = await supabase.from("users").select("id").limit(2);

  if (error || data?.length !== 1 || !data[0]?.id) {
    throw new Error("无法确认日报所属用户，请配置 CODEX_DAILY_USER_ID");
  }

  return data[0].id;
}

function readJsonFile(path, label) {
  if (!path) {
    throw new Error(`缺少 ${label}`);
  }

  return JSON.parse(readFileSync(path, "utf8"));
}

function readSummary(args) {
  if (args.includes("--summary-stdin")) {
    return JSON.parse(readFileSync(0, "utf8"));
  }

  return readJsonFile(readArgument(args, "--summary"), "--summary");
}

async function readDailyLogRecords(supabase, userId, date) {
  const { data, error } = await supabase
    .from("codex_log")
    .select("thread_title,user_tasks,assistant_summary,category,token_count")
    .eq("id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`读取当日日志失败：${error.message}`);
  }

  return (data ?? []).filter(isDailyReportLogRecord);
}

async function readDailyReport(supabase, userId, date) {
  const { data, error } = await supabase
    .from("codex_daily_report")
    .select(
      "date,desktop_token_total,session_count,summary,growth,shortage,summary_model,summary_generated_at,token_calculated_at",
    )
    .eq("id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`读取当日日报失败：${error.message}`);
  }

  return data;
}

async function main() {
  loadLocalEnv();

  const args = process.argv.slice(2);
  const date = readArgument(args, "--date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date 必须使用 YYYY-MM-DD");
  }

  const supabase = createSupabaseAdminClient();
  const userId = await resolveOwnerId(
    supabase,
    process.env.CODEX_DAILY_USER_ID?.trim(),
  );

  if (args.includes("--print-context")) {
    console.log(
      JSON.stringify(
        {
          date,
          records: await readDailyLogRecords(supabase, userId, date),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.includes("--print-report")) {
    console.log(
      JSON.stringify(await readDailyReport(supabase, userId, date), null, 2),
    );
    return;
  }

  const entriesPayload = readJsonFile(
    readArgument(args, "--entries"),
    "--entries",
  );
  const entries = Array.isArray(entriesPayload)
    ? entriesPayload
    : entriesPayload.entries;

  if (!Array.isArray(entries)) {
    throw new Error("entries 必须是数组");
  }
  const records = await readDailyLogRecords(supabase, userId, date);

  if (!records.length) {
    console.log("当日无日报记录，不创建 codex_daily_report");
    return;
  }

  const report = buildCodexDailyReport({
    date,
    entries,
    generatedAt: new Date().toISOString(),
    records,
    summary: readSummary(args),
    summaryModel:
      readArgument(args, "--summary-model") || defaultSummaryModel,
    userId,
  });

  const { error: upsertError } = await supabase
    .from("codex_daily_report")
    .upsert(report, { onConflict: "id,date" });

  if (upsertError) {
    throw new Error(`写入日报失败：${upsertError.message}`);
  }

  console.log(
    `Codex 每日日报已写入：${report.date}，${report.session_count} 个会话，${report.desktop_token_total} Token`,
  );
}

if (process.argv[1]?.endsWith("save-codex-daily-report.mjs")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
