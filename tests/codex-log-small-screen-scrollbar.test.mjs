import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

test("keeps compact Codex reports stacked until there is enough space", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(
    source,
    /codex-log-dashboard-shell @container\/codex-log/,
  );
  assert.match(
    source,
    /codex-log-metric-grid grid grid-cols-1 gap-3 @2xl\/codex-log:grid-cols-2 @5xl\/codex-log:grid-cols-3/,
  );
  assert.match(
    source,
    /codex-log-analysis-grid grid grid-cols-1 gap-4 @7xl\/codex-log:grid-cols-\[minmax\(420px,1\.35fr\)_minmax\(300px,0\.9fr\)_minmax\(300px,0\.95fr\)\]/,
  );
  assert.doesNotMatch(
    source,
    /codex-log-analysis-grid[^"`]*(?:^|\s)(?:xl|2xl):grid-cols-\[/,
  );
});

test("keeps the visible vertical scrollbar owned by the main report scrollport", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const taskListSource =
    source.match(/function TaskList[\s\S]*?function SummaryPanel/)?.[0] ?? "";

  assert.doesNotMatch(taskListSource, /<OverlayScrollArea/);
  assert.match(taskListSource, /codex-log-rank-list/);
});
