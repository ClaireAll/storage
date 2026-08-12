import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
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

test("renders a draggable overlay thumb for the fullscreen Codex log", async () => {
  const [dashboard, provider, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(dashboard, /className="home-fullscreen-scrollbar"/);
  assert.match(dashboard, /onPointerDown=\{handleFullscreenScrollbarPointerDown\}/);
  assert.match(dashboard, /onPointerMove=\{handleFullscreenScrollbarPointerMove\}/);
  assert.match(dashboard, /scrollContainer\.scrollTo\(\{ top:/);
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen\s*\{[\s\S]*?\.home-fullscreen-scrollbar-track\s*\{[\s\S]*?pointer-events:\s*auto;/,
  );
  assert.match(styles, /animation-timeline:\s*scroll\(nearest block\);/);
  assert.doesNotMatch(styles, /storage-scroll-surface-active::after/);
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
});
