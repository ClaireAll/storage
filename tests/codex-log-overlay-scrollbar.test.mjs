import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeDashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/codex-log-fullscreen-scroll.less",
  import.meta.url,
);

test("uses one overlay scrollbar treatment for preview and fullscreen Codex logs", async () => {
  const [dashboard, styles] = await Promise.all([
    readFile(homeDashboardPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(dashboard, /data-scroll-surface="true"/);
  assert.match(
    styles,
    /\.home-category-content-card\s*\{[\s\S]*\.codex-log-dashboard\s*\{[\s\S]*scrollbar-width:\s*none !important;/,
  );
  assert.match(
    styles,
    /\.codex-log-dashboard::-webkit-scrollbar\s*\{[\s\S]*display:\s*none !important;[\s\S]*width:\s*0 !important;/,
  );
  assert.match(
    styles,
    /\.ant-card-body::-webkit-scrollbar\s*\{[\s\S]*display:\s*none !important;[\s\S]*width:\s*0 !important;/,
  );
  assert.match(
    styles,
    /\.home-category-content-card\.storage-scroll-surface-active::after/,
  );
  assert.doesNotMatch(
    styles,
    /\.home-category-content-card:fullscreen\.storage-scroll-surface-active::after/,
  );
});
