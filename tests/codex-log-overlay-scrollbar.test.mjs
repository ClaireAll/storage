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

test("limits the outer overlay scrollbar to the Codex daily report", async () => {
  const [dashboard, styles] = await Promise.all([
    readFile(homeDashboardPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(
    dashboard,
    /data-scroll-surface=\{\s*activeCategoryHref === "\/home\/codex-log" \? "true" : undefined\s*\}/s,
  );
  assert.doesNotMatch(dashboard, /data-scroll-surface="true"/);
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
    /&::-webkit-scrollbar\s*\{[\s\S]*display:\s*none !important;[\s\S]*width:\s*0 !important;/,
  );
  assert.match(
    styles,
    /&\.storage-scroll-surface-active \.home-fullscreen-scrollbar-thumb/,
  );
  assert.doesNotMatch(
    styles,
    /storage-scroll-surface-active::after/,
  );
});
