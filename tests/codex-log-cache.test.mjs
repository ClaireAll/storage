import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardUtilsPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-utils.ts",
  import.meta.url,
);
const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const summaryRoutePath = new URL(
  "../src/app/api/codex-log/summary/route.ts",
  import.meta.url,
);

test("reads cached daily reports before scanning Codex desktop sessions", async () => {
  const source = await readFile(dashboardUtilsPath, "utf8");

  assert.equal(source.includes('from("codex_daily_report")'), true);
  assert.equal(source.includes("const missingTokenDates = trendDates.filter("), true);
  assert.equal(source.includes("if (missingTokenDates.length)"), true);
  assert.equal(source.includes("token_calculated_at"), true);
  assert.equal(source.includes('onConflict: "id,date"'), true);
  assert.ok(
    source.indexOf('from("codex_daily_report")') <
      source.indexOf("await readCodexDesktopUsageTotals("),
  );
});

test("passes an existing cached summary into the dashboard", async () => {
  const [dashboardSource, utilsSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(dashboardUtilsPath, "utf8"),
  ]);

  assert.equal(utilsSource.includes("dailySummary:"), true);
  assert.equal(dashboardSource.includes("initialSummary={data.dailySummary}"), true);
});

test("loads the dashboard record range with one Codex log query", async () => {
  const source = await readFile(dashboardUtilsPath, "utf8");

  assert.equal(source.includes("const [recordRangeResult, dateResult, dailyReportResult]"), true);
  assert.equal(source.includes("const records = recordRows"), true);
  assert.equal(source.includes("const previousRecords = recordRows"), true);
});

test("returns cached summaries before calling DeepSeek and stores generated results", async () => {
  const source = await readFile(summaryRoutePath, "utf8");

  const dailyReportRead = source.indexOf('from("codex_daily_report")');
  const apiKeyRead = source.indexOf("process.env.DEEPSEEK_API_KEY");

  assert.notEqual(dailyReportRead, -1);
  assert.notEqual(apiKeyRead, -1);
  assert.ok(dailyReportRead < apiKeyRead);
  assert.equal(source.includes("summary_generated_at"), true);
  assert.equal(source.includes('onConflict: "id,date"'), true);
});
