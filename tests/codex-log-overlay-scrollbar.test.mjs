import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const homeDashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const stylesPath = new URL(
  "../src/app/globals.css",
  import.meta.url,
);

test("limits the shared overlay scrollbar activity to the Codex daily report", async () => {
  const [dashboard, homeDashboard, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(homeDashboardPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(
    homeDashboard,
    /data-scroll-surface=\{\s*activeCategoryHref === "\/home\/codex-log" \? "true" : undefined\s*\}/s,
  );
  assert.doesNotMatch(homeDashboard, /data-scroll-surface="true"/);
  assert.match(dashboard, /<OverlayScrollArea[\s\S]*?horizontal[\s\S]*?viewportClassName=/);
  assert.match(dashboard, /codex-log-dashboard-shell/);
  assert.match(styles, /\.storage-overlay-scrollbar-container\s*\{[\s\S]*?scrollbar-gutter:\s*auto;/);
  assert.match(styles, /\.storage-overlay-scrollbar-viewport\s*\{[\s\S]*?scrollbar-width:\s*thin;/);
  assert.match(styles, /\.storage-is-vertically-scrolling\s*\{[\s\S]*?scrollbar-color:/);
  assert.doesNotMatch(styles, /storage-scroll-surface-active::after/);
});
