import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("codex daily report persistence replaces only the same user's same-day rows", async () => {
  const { saveCodexDailyReports } = await import(
    new URL("../scripts/import-codex-daily-reports.mjs", import.meta.url)
  );
  const calls = [];
  const supabase = {
    from(table) {
      return {
        delete() {
          calls.push(["delete", table]);
          return {
            eq(column, value) {
              calls.push(["delete.eq", column, value]);
              return this;
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
    ],
    ownerId: "user-1",
    supabase,
    table: "codex_log",
  });

  assert.deepEqual(calls, [
    ["delete", "codex_log"],
    ["delete.eq", "id", "user-1"],
    ["delete.eq", "date", "2026-08-03"],
    [
      "insert",
      "codex_log",
      [
        {
          assistant_summary: "已写入",
          category: 10000,
          date: "2026-08-03",
          id: "user-1",
          thread_title: "Storage",
          token_count: 88,
          user_tasks: "日报",
        },
      ],
    ],
  ]);
});
