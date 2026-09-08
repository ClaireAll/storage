import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

function getSessionTimelineSource(source) {
  const start = source.indexOf("function SessionTimeline");
  const end = source.indexOf("export function CodexLogDashboard", start);

  return source.slice(start, end);
}

test("renders session records as an Ant Design timeline", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const timelineSource = getSessionTimelineSource(source);

  assert.match(source, /Timeline,/);
  assert.doesNotMatch(source, /\bTable,/);
  assert.doesNotMatch(source, /TableColumnsType|TableProps|<Table/);
  assert.match(timelineSource, /<Timeline/);
  assert.match(timelineSource, /mode="alternate"/);
  assert.match(timelineSource, /title:\s*\(/);
  assert.match(timelineSource, /content:\s*\(/);
  assert.match(timelineSource, /palette:\s*ChartPalette/);
  assert.match(timelineSource, /palette\.columns\[index % palette\.columns\.length\]/);
  assert.match(timelineSource, /--codex-log-session-color/);
  assert.match(timelineSource, /bg-\[color-mix\(in_srgb,var\(--codex-log-session-color\)_14%,transparent\)\]/);
  assert.match(timelineSource, /inline-flex/);
  assert.match(timelineSource, /items-baseline/);
  assert.match(timelineSource, /w-fit/);
  assert.match(timelineSource, /max-w-\[min\(32rem,100%\)\]/);
  assert.doesNotMatch(timelineSource, /mode="left"|mode="right"/);
  assert.doesNotMatch(timelineSource, /\blabel:\s*\(/);
  assert.doesNotMatch(timelineSource, /\bchildren:\s*\(/);
  assert.match(timelineSource, /border-0/);
  assert.doesNotMatch(
    timelineSource,
    /border-\[color:color-mix\(in_srgb,var\(--home-preview-border-soft-color\)_58%,transparent\)\]/,
  );
  assert.match(timelineSource, /record\.time/);
  assert.match(timelineSource, /record\.thread_title/);
  assert.match(timelineSource, /text-xs font-medium leading-5 tabular-nums/);
  assert.match(timelineSource, /formatToken\(record\.token_count\)} Token/);
  assert.doesNotMatch(timelineSource, /record\.repository|record\.user_tasks|record\.assistant_summary/);
});

test("keeps timeline session text wrapped without hover-only content", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const timelineSource = getSessionTimelineSource(source);

  assert.equal(timelineSource.includes("ellipsis"), false);
  assert.equal(timelineSource.includes("tooltip"), false);
  assert.equal(timelineSource.includes("title="), false);
  assert.match(timelineSource, /whitespace-normal/);
  assert.match(timelineSource, /wrap-break-word/);
});

test("filters and orders timeline records without table state", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /const timelineRecords = useMemo/);
  assert.match(source, /getRecordTimestamp\(right\) - getRecordTimestamp\(left\)/);
  assert.doesNotMatch(source, /tableFilters|tablePage|tableSorter|handleTableChange/);
});
