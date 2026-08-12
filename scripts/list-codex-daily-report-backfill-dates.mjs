import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function isDailyReportLogRecord(record) {
  return !(
    record?.thread_title?.trim().startsWith("Automation:") ||
    record?.user_tasks?.trim().startsWith("Automation:")
  );
}

function loadLocalEnv() {
  try {
    const envText = readFileSync(".env.local", "utf8");

    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);

      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Environment variables can be supplied directly by the automation.
  }
}

function isCompleteReport(report) {
  return Boolean(
    report?.summary?.trim() &&
      report.growth?.trim() &&
      report.shortage?.trim() &&
      report.summary_model?.trim() &&
      report.summary_generated_at &&
      report.token_calculated_at &&
      Number.isInteger(report.session_count) &&
      report.session_count >= 0 &&
      Number.isFinite(Number(report.desktop_token_total)),
  );
}

/** Returns dated log records that still need an automated daily report. */
export function findCodexDailyReportBackfillDates({ logRecords, reports }) {
  const reportsByDate = new Map(
    reports.filter((report) => report.date).map((report) => [report.date, report]),
  );

  return [...new Set(
    logRecords
      .filter(isDailyReportLogRecord)
      .map((record) => record.date)
      .filter(Boolean),
  )]
    .filter((date) => !isCompleteReport(reportsByDate.get(date)))
    .sort();
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function resolveOwnerId(supabase) {
  const ownerId = process.env.CODEX_DAILY_USER_ID?.trim();

  if (ownerId) {
    return ownerId;
  }

  const { data, error } = await supabase.from("users").select("id").limit(2);

  if (error || data?.length !== 1 || !data[0]?.id) {
    throw new Error("无法确认日报所属用户，请配置 CODEX_DAILY_USER_ID");
  }

  return data[0].id;
}

async function main() {
  loadLocalEnv();

  const supabase = createSupabaseAdminClient();
  const userId = await resolveOwnerId(supabase);
  const [{ data: logs, error: logError }, { data: reports, error: reportError }] =
    await Promise.all([
      supabase
        .from("codex_log")
        .select("date,thread_title,user_tasks")
        .eq("id", userId),
      supabase
        .from("codex_daily_report")
        .select(
          "date,desktop_token_total,session_count,summary,growth,shortage,summary_model,summary_generated_at,token_calculated_at",
        )
        .eq("id", userId),
    ]);

  if (logError || reportError) {
    throw new Error(`读取日报回填状态失败：${logError?.message ?? reportError?.message}`);
  }

  console.log(
    JSON.stringify(
      findCodexDailyReportBackfillDates({
        logRecords: logs ?? [],
        reports: reports ?? [],
      }),
    ),
  );
}

if (process.argv[1]?.endsWith("list-codex-daily-report-backfill-dates.mjs")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
