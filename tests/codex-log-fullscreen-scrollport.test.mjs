import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeDashboardPath = new URL(
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
const themeStylesPath = new URL(
  "../src/app/(pages)/theme/theme.less",
  import.meta.url,
);

test("uses the full fullscreen card body as the Codex log scrollport", async () => {
  const [dashboard, provider, styles, themeStyles] = await Promise.all([
    readFile(homeDashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(stylesPath, "utf8"),
    readFile(themeStylesPath, "utf8"),
  ]);

  assert.match(dashboard, /data-scroll-surface="true"/);
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen\s*\{[\s\S]*\.ant-card-body\s*\{[\s\S]*overflow-y:\s*auto !important;/,
  );
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen\s*\{[\s\S]*\.codex-log-dashboard\s*\{[\s\S]*overflow-y:\s*visible !important;/,
  );
  assert.match(
    styles,
    /\.codex-log-dashboard\s*\{[\s\S]*flex:\s*0 0 auto !important;[\s\S]*min-height:\s*100%;/,
  );
  assert.match(styles, /::-webkit-scrollbar\s*\{[\s\S]*width:\s*0 !important;/);
  assert.match(styles, /\.ant-card-body\s*\{[\s\S]*padding:\s*16px !important;/);
  assert.match(
    styles,
    /\.home-category-content-card\.storage-scroll-surface-active::after/,
  );
  assert.match(provider, /const scrollSurfaceActiveClassName/);
  assert.ok(
    themeStyles.indexOf('"./styles/home.less"') <
      themeStyles.indexOf('"./styles/codex-log-fullscreen-scroll.less"'),
  );
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
});
