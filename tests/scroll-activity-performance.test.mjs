import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const providerPath = new URL(
  "../src/app/(pages)/common/scroll-activity-provider.tsx",
  import.meta.url,
);
const globalsPath = new URL("../src/app/globals.css", import.meta.url);
const homeStylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);

test("keeps dashboard scrolling outside React render state", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.doesNotMatch(source, /isDashboardScrolling/);
  assert.doesNotMatch(source, /onScroll=\{handleDashboardScroll\}/);
});

test("uses the browser scroll target without layout reads on scroll", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.doesNotMatch(source, /getComputedStyle|scrollHeight|clientHeight/);
  assert.match(source, /getScrollContainer\(event\.target\)/);
  assert.match(source, /addEventListener\("scrollend", handleScrollEnd/);
});

test("publishes scroll activity without adding dashboard-local listeners", async () => {
  const [dashboard, provider] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
  ]);

  assert.match(provider, /scrollActivityChangeEventName/);
  assert.match(provider, /new CustomEvent<ScrollActivityChangeDetail>/);
  assert.match(provider, /scheduleFrostResume/);
  assert.doesNotMatch(dashboard, /addEventListener\("scroll"/);
});

test("shows the active scrollbar without component-local listeners", async () => {
  const source = await readFile(globalsPath, "utf8");

  assert.match(source, /\.storage-is-vertically-scrolling::\-webkit-scrollbar/);
  assert.match(
    source,
    /\.storage-is-vertically-scrolling::\-webkit-scrollbar-thumb/,
  );
  assert.match(source, /\.storage-is-vertically-scrolling\s*\{[^}]*scrollbar-width:\s*thin/s);
});

test("keeps the fullscreen dashboard as the visible vertical scroll container", async () => {
  const source = await readFile(homeStylesPath, "utf8");

  assert.match(
    source,
    /:fullscreen \.codex-log-dashboard\s*\{[^}]*overflow-y:\s*auto !important;[^}]*scrollbar-gutter:\s*stable/s,
  );
});
