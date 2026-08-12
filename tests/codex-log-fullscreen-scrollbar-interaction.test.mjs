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
const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/codex-log-fullscreen-scroll.less",
  import.meta.url,
);

test("renders a draggable overlay thumb for the Codex log in preview and fullscreen", async () => {
  const [dashboard, provider, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(dashboard, /className="codex-log-scrollbar"/);
  assert.match(dashboard, /onPointerDown=\{handleScrollbarPointerDown\}/);
  assert.match(dashboard, /onPointerMove=\{handleScrollbarPointerMove\}/);
  assert.match(dashboard, /scrollContainer\.scrollTo\(\{ top:/);
  assert.match(dashboard, /new ResizeObserver\(syncScrollportHeight\)/);
  assert.match(
    styles,
    /\.codex-log-dashboard\s*\{[\s\S]*?scroll-timeline-name:\s*--codex-log-scrollbar-timeline;/,
  );
  assert.match(styles, /\.codex-log-scrollbar-track\s*\{[\s\S]*?pointer-events:\s*auto;/);
  assert.match(styles, /animation-timeline:\s*--codex-log-scrollbar-timeline;/);
  assert.doesNotMatch(styles, /storage-scroll-surface-active::after/);
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
});
