import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const dashboardUtilsPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-utils.ts",
  import.meta.url,
);
const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
test("reads daily reports without writing token cache from the dashboard", async () => {
  const source = await readFile(dashboardUtilsPath, "utf8");

  assert.equal(source.includes('from("codex_daily_report")'), true);
  assert.equal(source.includes("token_calculated_at"), true);
  assert.doesNotMatch(source, /readCodexDesktopUsageTotals/);
  assert.doesNotMatch(source, /cacheDesktopUsageTotals/);
  assert.doesNotMatch(source, /\.upsert\(/);
});

test("uses only automated desktop token totals", async () => {
  const source = await readFile(dashboardUtilsPath, "utf8");

  assert.match(source, /if \(report\.token_calculated_at\) \{/);
  assert.match(source, /toTokenCount\(report\?\.desktop_token_total\)/);
  assert.doesNotMatch(source, /missingTokenDates/);
  assert.doesNotMatch(source, /generatedTotals/);
});

test("passes an existing cached summary into the dashboard", async () => {
  const [dashboardSource, utilsSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(dashboardUtilsPath, "utf8"),
  ]);

  assert.equal(utilsSource.includes("dailySummary:"), true);
  assert.equal(dashboardSource.includes("initialSummary={data.dailySummary}"), true);
  assert.match(dashboardSource, /function SummaryPanel\(\{ initialSummary \}/);
  assert.doesNotMatch(dashboardSource, /summaryState/);
});

test("loads the dashboard record range with one Codex log query", async () => {
  const source = await readFile(dashboardUtilsPath, "utf8");

  assert.equal(source.includes("const [recordRangeResult, dateResult, dailyReportResult]"), true);
  assert.equal(source.includes("const records = recordRows"), true);
  assert.equal(source.includes("const previousRecords = recordRows"), true);
});

test("only renders the automated daily summary", async () => {
  const dashboardSource = await readFile(dashboardPath, "utf8");
  const summaryRoutePath = new URL(
    "../src/app/api/codex-log/summary/route.ts",
    import.meta.url,
  );

  await assert.rejects(access(summaryRoutePath));
  assert.doesNotMatch(dashboardSource, /\/api\/codex-log\/summary/);
  assert.doesNotMatch(dashboardSource, /loadSummary/);
});
