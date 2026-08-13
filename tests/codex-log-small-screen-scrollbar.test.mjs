import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

test("keeps compact Codex analysis stacked until there is enough space", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(
    source,
    /codex-log-dashboard-shell @container\/codex-log/,
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
  const longestSessionSource =
    source.match(/function LongestSessionList[\s\S]*?function SummaryPanel/)?.[0] ??
    "";

  assert.doesNotMatch(longestSessionSource, /<OverlayScrollArea/);
  assert.match(longestSessionSource, /codex-log-longest-list/);
});

test("renders longest sessions as compact rows instead of ranked cards", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const listSource =
    source.match(/function LongestSessionList[\s\S]*?function SummaryPanel/)?.[0] ??
    "";

  assert.match(listSource, /codex-log-longest-list/);
  assert.match(listSource, /codex-log-longest-row/);
  assert.match(listSource, /codex-log-longest-repository/);
  assert.match(listSource, /codex-log-longest-meta/);
  assert.doesNotMatch(listSource, /codex-log-rank-index/);
  assert.doesNotMatch(listSource, /\{index \+ 1\}/);
});
