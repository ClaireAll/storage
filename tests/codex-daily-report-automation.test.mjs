import assert from "node:assert/strict";
import test from "node:test";

const reportScriptPath = new URL(
  "../scripts/save-codex-daily-report.mjs",
  import.meta.url,
);

test("builds a complete daily report after importing Codex sessions", async () => {
  const { buildCodexDailyReport } = await import(reportScriptPath);
  const generatedAt = "2026-08-12T00:01:00.000Z";

  const report = buildCodexDailyReport({
    date: "2026-08-11",
    entries: [
      { codex_thread_id: "thread-a" },
      { codex_thread_id: "thread-a" },
      { codex_thread_id: "thread-b" },
    ],
    generatedAt,
    records: [
      {
        assistant_summary: "完成了日报导入。",
        category: 4,
        thread_title: "日报导入",
        token_count: 1200,
        user_tasks: "导入日报数据",
      },
      {
        assistant_summary: "完成了日报总结。",
        category: 2,
        thread_title: "日报总结",
        token_count: 2300,
        user_tasks: "生成日报总结",
      },
    ],
    summary: {
      growth: "能把导入和复盘收进同一条自动化链路。",
      shortage: "后续可继续观察日报数据是否完整。",
      summary: "完成了日报数据导入和总结生成。",
    },
    summaryModel: "codex:gpt-5+human-writing",
    userId: "user-1",
  });

  assert.deepEqual(
    report,
    {
      date: "2026-08-11",
      desktop_token_total: 3500,
      growth: "能把导入和复盘收进同一条自动化链路。",
      id: "user-1",
      session_count: 2,
      shortage: "后续可继续观察日报数据是否完整。",
      summary: "完成了日报数据导入和总结生成。",
      summary_generated_at: generatedAt,
      summary_model: "codex:gpt-5+human-writing",
      token_calculated_at: generatedAt,
    },
  );
});

test("does not create a daily report when no log records were imported", async () => {
  const { buildCodexDailyReport } = await import(reportScriptPath);

  assert.equal(
    buildCodexDailyReport({
      date: "2026-08-11",
      entries: [],
      generatedAt: "2026-08-12T00:01:00.000Z",
      records: [],
      summary: { growth: "", shortage: "", summary: "" },
      summaryModel: "codex:gpt-5+human-writing",
      userId: "user-1",
    }),
    null,
  );
});

test("excludes imported automation records from the daily report context", async () => {
  const { isDailyReportLogRecord } = await import(reportScriptPath);

  assert.equal(
    isDailyReportLogRecord({
      thread_title: "Automation: Codex 日报入库",
      user_tasks: "Automation: Codex 日报入库",
    }),
    false,
  );
  assert.equal(
    isDailyReportLogRecord({
      thread_title: "日报导入",
      user_tasks: "导入日报数据",
    }),
    true,
  );
});
