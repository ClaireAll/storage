import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function readSource(path) {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

const scriptSource = readSource("../scripts/import-codex-daily-reports.mjs");
const migrationSource = readSource(
  "../supabase/migrations/20260803_create_codex_log.sql",
);

test("codex daily report script uses the approved report table columns", () => {
  assert.match(scriptSource, /DEFAULT_REPORT_TABLE = "codex_log"/);
  assert.match(scriptSource, /assistant_summary/);
  assert.match(scriptSource, /token_count/);
  assert.match(scriptSource, /thread_title/);
  assert.match(scriptSource, /user_tasks/);
  assert.doesNotMatch(scriptSource, /thread_ref/);
  assert.doesNotMatch(scriptSource, /original_text/);
});

test("codex daily report migration targets the actual codex log table", () => {
  assert.match(migrationSource, /create table if not exists public\.codex_log/);
  assert.match(migrationSource, /token_count int4/);
  assert.match(migrationSource, /codex_log_id_date_idx/);
  assert.match(migrationSource, /codex_log_select_own/);
  assert.doesNotMatch(migrationSource, /codex_daily_reports/);
});

test("codex daily report category resolver follows the repository mapping", async () => {
  const { resolveCodexReportCategory } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );

  assert.equal(resolveCodexReportCategory({ cwd: "D:/work/fx-data-web" }), 1);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/work/fv-web2" }), 1);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/skills" }), 2);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/chrome-plugin" }), 3);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/storage" }), 4);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/2026" }), 5);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/money-tool" }), 6);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/fd-biz" }), 7);
  assert.equal(resolveCodexReportCategory({ cwd: "D:/Claire/unknown" }), 10000);
});

test("codex daily report normalization trims summaries and skips empty records", async () => {
  const { normalizeCodexDailyReportEntries } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );

  assert.deepEqual(
    normalizeCodexDailyReportEntries(
      [
        {
          assistant_summa: "  已完成自动化设计  ",
          cwd: "D:/Claire/storage",
          thread_title: " Storage ",
          token_count: "1234",
          user_tasks: "  每天整理日报  ",
        },
        {
          assistant_summa: " ",
          thread_title: "空记录",
          user_tasks: "",
        },
      ],
      "2026-08-03",
    ),
    [
      {
        assistant_summary: "已完成自动化设计",
        category: 4,
        date: "2026-08-03",
        thread_title: "Storage",
        token_count: 1234,
        user_tasks: "每天整理日报",
      },
    ],
  );
});

test("codex daily report estimates token counts when usage is unavailable", async () => {
  const {
    estimateCodexLogTokenCount,
    normalizeCodexDailyReportEntries,
  } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const entry = {
    assistant_summary: "补充数据库里的 token_count 估算值，并同步定时任务描述。",
    thread_title: "Storage",
    user_tasks: "接受估算，现在补充一下数据库里的估算值。",
  };
  const estimatedTokenCount = estimateCodexLogTokenCount(entry);

  assert.equal(Number.isInteger(estimatedTokenCount), true);
  assert.ok(estimatedTokenCount >= 800);
  assert.deepEqual(
    normalizeCodexDailyReportEntries([entry], "2026-08-04"),
    [
      {
        assistant_summary:
          "补充数据库里的 token_count 估算值，并同步定时任务描述。",
        category: 4,
        date: "2026-08-04",
        thread_title: "Storage",
        token_count: estimatedTokenCount,
        user_tasks: "接受估算，现在补充一下数据库里的估算值。",
      },
    ],
  );
});

test("codex daily report estimates from raw turn text before summary fallback", async () => {
  const {
    estimateCodexLogTokenCount,
    normalizeCodexDailyReportEntries,
  } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const entry = {
    assistant_summary: "Compressed answer summary.",
    thread_title: "Storage",
    token_basis: "Original user prompt and assistant answer content. ".repeat(600),
    user_tasks: "Compressed user task.",
  };
  const rawEstimate = estimateCodexLogTokenCount(entry);
  const summaryEstimate = estimateCodexLogTokenCount({
    assistant_summary: entry.assistant_summary,
    thread_title: entry.thread_title,
    user_tasks: entry.user_tasks,
  });

  assert.ok(rawEstimate > summaryEstimate);
  assert.deepEqual(
    normalizeCodexDailyReportEntries([entry], "2026-08-04"),
    [
      {
        assistant_summary: "Compressed answer summary.",
        category: 4,
        date: "2026-08-04",
        thread_title: "Storage",
        token_count: rawEstimate,
        user_tasks: "Compressed user task.",
      },
    ],
  );
});

test("codex daily report uses desktop thread usage before text estimates", async () => {
  const {
    applyCodexDesktopUsageTokenCounts,
    normalizeCodexDailyReportEntries,
  } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const entries = [
      {
        assistant_summary: "完成页面布局调整。",
        codex_thread_id: "thread-1",
        thread_title: "Storage",
        user_tasks: "调整 Codex 日报。",
      },
      {
        assistant_summary: "补充测试。",
        codex_thread_id: "thread-1",
        thread_title: "Storage",
        user_tasks: "继续调整 Codex 日报。",
      },
    ];

  assert.deepEqual(
    normalizeCodexDailyReportEntries(
      applyCodexDesktopUsageTokenCounts(entries, [
        {
          cwd: "D:/Claire/storage",
          id: "thread-1",
          title: "Storage",
          tokens_used: 91240000,
        },
      ]),
      "2026-08-04",
    ),
    [
      {
        assistant_summary: "完成页面布局调整。",
        category: 4,
        date: "2026-08-04",
        thread_title: "Storage",
        token_count: 45620000,
        user_tasks: "调整 Codex 日报。",
      },
      {
        assistant_summary: "补充测试。",
        category: 4,
        date: "2026-08-04",
        thread_title: "Storage",
        token_count: 45620000,
        user_tasks: "继续调整 Codex 日报。",
      },
    ],
  );
});

test("codex daily report parses sqlite json rows with multiline titles", async () => {
  const { parseCodexDesktopUsageRows } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );

  assert.deepEqual(
    parseCodexDesktopUsageRows(
      JSON.stringify([
        {
          cwd: "\\\\?\\D:\\Claire\\storage",
          id: "thread-1",
          title: "第一行\n第二行",
          tokens_used: 123456,
        },
      ]),
    ),
    [
      {
        cwd: "\\\\?\\D:\\Claire\\storage",
        id: "thread-1",
        title: "第一行\n第二行",
        tokens_used: 123456,
      },
    ],
  );
});

test("codex daily report reads session token count events by Shanghai date", async () => {
  const { readCodexDesktopUsageThreads } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const tempRoot = mkdtempSync(join(tmpdir(), "codex-session-usage-"));
  const threadId = "019f0000-0000-7000-8000-000000000001";
  const sessionPath = join(
    tempRoot,
    `rollout-2026-08-03T09-00-00-${threadId}.jsonl`,
  );

  writeFileSync(
    sessionPath,
    [
      JSON.stringify({
        timestamp: "2026-08-03T01:00:00.000Z",
        type: "session_meta",
        payload: {
          cwd: "D:/Claire/storage",
          id: threadId,
        },
      }),
      JSON.stringify({
        timestamp: "2026-08-03T01:00:01.000Z",
        type: "response_item",
        payload: {
          role: "user",
          content: [{ text: "Storage task\nsecond line" }],
        },
      }),
      JSON.stringify({
        timestamp: "2026-08-03T01:00:02.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              total_tokens: 1200,
            },
          },
        },
      }),
      JSON.stringify({
        timestamp: "2026-08-03T15:59:59.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              total_tokens: 1800,
            },
          },
        },
      }),
      JSON.stringify({
        timestamp: "2026-08-04T16:00:00.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              total_tokens: 9999,
            },
          },
        },
      }),
    ].join("\n"),
    "utf8",
  );

  try {
    assert.deepEqual(
      await readCodexDesktopUsageThreads({
        date: "2026-08-03",
        sessionsRoots: [tempRoot],
        sqlitePath: "missing-sqlite",
        statePath: "missing-state",
      }),
      [
        {
          cwd: "D:/Claire/storage",
          id: threadId,
          title: "Storage task",
          tokens_used: 3000,
        },
      ],
    );
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

test("codex daily report reads sqlite SQL through stdin", () => {
  assert.match(scriptSource, /execFileSync\(sqlite,\s*\[targetStatePath\]/);
  assert.match(scriptSource, /input:\s*sql/);
  assert.doesNotMatch(scriptSource, /execFileSync\(sqlite,\s*\[targetStatePath,\s*sql\]/);
});

test("codex daily report persistence appends new rows without deleting existing same-day rows", async () => {
  const { saveCodexDailyReports } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const calls = [];
  const supabase = {
    from(table) {
      return {
        select(columns) {
          calls.push(["select", table, columns]);
          return {
            eq(column, value) {
              calls.push(["select.eq", column, value]);
              return this;
            },
            then(resolve) {
              return Promise.resolve({
                data: [
                  {
                    assistant_summary: "已写入",
                    thread_title: "Storage",
                    user_tasks: "日报",
                  },
                ],
                error: null,
              }).then(resolve);
            },
          };
        },
        insert(rows) {
          calls.push(["insert", table, rows]);
          return { error: null };
        },
      };
    },
  };

  await saveCodexDailyReports({
    date: "2026-08-03",
    entries: [
      {
        assistant_summary: "已写入",
        date: "2026-08-03",
        thread_title: "Storage",
        token_count: 88.8,
        user_tasks: "日报",
      },
      {
        assistant_summary: "新增",
        date: "2026-08-03",
        thread_title: "Storage",
        token_count: 66,
        user_tasks: "新任务",
      },
    ],
    ownerId: "user-1",
    supabase,
    table: "codex_log",
  });

  assert.deepEqual(calls, [
    [
      "select",
      "codex_log",
      "r_id,thread_title,user_tasks,assistant_summary,token_count",
    ],
    ["select.eq", "id", "user-1"],
    ["select.eq", "date", "2026-08-03"],
    [
      "insert",
      "codex_log",
      [
        {
          assistant_summary: "新增",
          category: 10000,
          date: "2026-08-03",
          id: "user-1",
          thread_title: "Storage",
          token_count: 66,
          user_tasks: "新任务",
        },
      ],
    ],
  ]);
});

test("codex daily report persistence refreshes token counts for existing rows", async () => {
  const { saveCodexDailyReports } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const calls = [];
  const supabase = {
    from(table) {
      const query = {
        eq(column, value) {
          calls.push(["eq", column, value]);
          return this;
        },
      };

      return {
        select(columns) {
          calls.push(["select", table, columns]);
          return {
            ...query,
            then(resolve) {
              return Promise.resolve({
                data: [
                  {
                    assistant_summary: "旧总结",
                    r_id: "row-1",
                    thread_title: "Storage",
                    token_count: 800,
                    user_tasks: "日报",
                  },
                ],
                error: null,
              }).then(resolve);
            },
          };
        },
        update(row) {
          calls.push(["update", table, row]);
          return { ...query, error: null };
        },
        insert(rows) {
          calls.push(["insert", table, rows]);
          return { error: null };
        },
      };
    },
  };

  const result = await saveCodexDailyReports({
    date: "2026-08-04",
    entries: [
      {
        assistant_summary: "旧总结",
        date: "2026-08-04",
        thread_title: "Storage",
        token_count: 91240000,
        user_tasks: "日报",
      },
    ],
    ownerId: "user-1",
    supabase,
    table: "codex_log",
  });

  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.deepEqual(calls, [
    [
      "select",
      "codex_log",
      "r_id,thread_title,user_tasks,assistant_summary,token_count",
    ],
    ["eq", "id", "user-1"],
    ["eq", "date", "2026-08-04"],
    ["update", "codex_log", { token_count: 91240000 }],
    ["eq", "r_id", "row-1"],
  ]);
});
