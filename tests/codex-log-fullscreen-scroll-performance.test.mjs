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
  "../src/app/(pages)/theme/styles/codex-log-scroll-performance.less",
  import.meta.url,
);

test("pauses the shared background through a root class while fullscreen dashboard scrolls", async () => {
  const [dashboard, provider, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(
    dashboard,
    /data-scroll-pauses-background=\{\s*fullscreen\?\.isFullscreen \? "true" : undefined\s*\}/s,
  );
  assert.match(provider, /closest\(sharedBackgroundPauseSelector\)/);
  assert.match(
    provider,
    /if \(activeScrollContainer === nextScrollContainer\) \{\s*clearTimer\(\);/s,
  );
  assert.match(
    provider,
    /document\.documentElement\.classList\.toggle\(\s*sharedBackgroundPausedClassName,\s*isPaused,\s*\)/s,
  );
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
  assert.match(
    styles,
    /html\.storage-scroll-background-paused\s*\{[\s\S]*\.theme-shared-texture-root/s,
  );
  assert.match(styles, /\.app-textured-shell::before,[\s\S]*animation-play-state:\s*paused/s);
  assert.match(styles, /animation-play-state:\s*paused/);
});
