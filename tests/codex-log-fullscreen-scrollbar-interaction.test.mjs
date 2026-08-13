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
const overlayScrollbarPath = new URL(
  "../src/app/(pages)/common/overlay-scrollbar.tsx",
  import.meta.url,
);
const stylesPath = new URL("../src/app/globals.css", import.meta.url);

test("keeps the Codex log scrollbar native and outside React scroll state", async () => {
  const [dashboard, provider, overlayScrollbar, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(overlayScrollbarPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(dashboard, /<OverlayScrollArea[\s\S]*?horizontal[\s\S]*?viewportClassName=/);
  assert.match(dashboard, /codex-log-dashboard-shell/);
  assert.match(dashboard, /overflow-x-auto/);
  assert.doesNotMatch(dashboard, /<OverlayScrollbar scrollTarget=\{scrollTarget\} \/>/);
  assert.doesNotMatch(overlayScrollbar, /onPointerDown/);
  assert.doesNotMatch(overlayScrollbar, /onPointerMove/);
  assert.doesNotMatch(overlayScrollbar, /setPointerCapture/);
  assert.doesNotMatch(overlayScrollbar, /scrollTarget\.scrollTo/);
  assert.doesNotMatch(overlayScrollbar, /new ResizeObserver/);
  assert.doesNotMatch(overlayScrollbar, /new ScrollTimelineClass/);
  assert.match(styles, /scrollbar-width:\s*thin;/);
  assert.match(styles, /storage-is-vertically-scrolling/);
  assert.doesNotMatch(styles, /100dvh - 100px/);
  assert.doesNotMatch(styles, /storage-scroll-surface-active::after/);
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
});
