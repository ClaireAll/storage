import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const fullscreenPath = new URL(
  "../src/app/(pages)/home/home-content-fullscreen.tsx",
  import.meta.url,
);

test("keeps the Codex table tall while constraining it to fullscreen height", async () => {
  const [dashboardSource, fullscreenSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(fullscreenPath, "utf8"),
  ]);

  assert.match(fullscreenSource, /export function useHomeContentFullscreen/);
  assert.match(dashboardSource, /useHomeContentFullscreen\(\)/);
  assert.match(dashboardSource, /const tableScrollY = fullscreen\?\.isFullscreen/);
  assert.match(dashboardSource, /clamp\(260px, 36dvh, 440px\)/);
  assert.match(dashboardSource, /scroll=\{\{ x: 1170, y: tableScrollY \}\}/);
});

test("keeps the summary available without dashboard scroll render state", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.doesNotMatch(source, /onScroll=\{handleDashboardScroll\}/);
  assert.match(source, /codex-log-table-panel[^"`]*shrink-0/);
  assert.match(source, /codex-log-summary-panel[^"`]*shrink-0/);
});
