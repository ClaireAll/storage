import assert from "node:assert/strict";
import test from "node:test";

const backfillPath = new URL(
  "../scripts/list-codex-daily-report-backfill-dates.mjs",
  import.meta.url,
);

test("selects only log dates whose daily report is incomplete", async () => {
  const { findCodexDailyReportBackfillDates } = await import(backfillPath);

  assert.deepEqual(
    findCodexDailyReportBackfillDates({
      logRecords: [
        { date: "2026-08-05", thread_title: "修复日报", user_tasks: "更新日报" },
        { date: "2026-08-06", thread_title: "整理数据", user_tasks: "补充统计" },
        { date: "2026-08-07", thread_title: "自动化", user_tasks: "生成日报" },
        {
          date: "2026-08-08",
          thread_title: "Automation: Codex 日报入库",
          user_tasks: "Automation: Codex 日报入库",
        },
      ],
      reports: [
        {
          date: "2026-08-05",
          desktop_token_total: 0,
          growth: "已完成",
          session_count: 1,
          shortage: "无",
          summary: "已写入",
          summary_generated_at: "2026-08-06T00:01:00.000Z",
          summary_model: "codex:gpt-5+human-writing",
          token_calculated_at: "2026-08-06T00:01:00.000Z",
        },
        {
          date: "2026-08-06",
          desktop_token_total: 1200,
          growth: "已完成",
          session_count: null,
          shortage: "无",
          summary: "已写入",
          summary_generated_at: "2026-08-07T00:01:00.000Z",
          summary_model: "codex:gpt-5+human-writing",
          token_calculated_at: "2026-08-07T00:01:00.000Z",
        },
      ],
    }),
    ["2026-08-06", "2026-08-07"],
  );
});
