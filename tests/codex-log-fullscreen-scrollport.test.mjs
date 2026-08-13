import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeDashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const providerPath = new URL(
  "../src/app/(pages)/common/scroll-activity-provider.tsx",
  import.meta.url,
);
const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);
const overlayScrollbarPath = new URL(
  "../src/app/(pages)/common/overlay-scrollbar.tsx",
  import.meta.url,
);

test("uses one explicit dashboard scrollport inside the fullscreen card", async () => {
  const [homeDashboard, dashboard, provider, styles, overlayScrollbar] = await Promise.all([
    readFile(homeDashboardPath, "utf8"),
    readFile(dashboardPath, "utf8"),
    readFile(providerPath, "utf8"),
    readFile(stylesPath, "utf8"),
    readFile(overlayScrollbarPath, "utf8"),
  ]);

  assert.match(
    homeDashboard,
    /data-scroll-surface=\{\s*activeCategoryHref === "\/home\/codex-log" \? "true" : undefined\s*\}/s,
  );
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen\s*\{[\s\S]*?overflow:\s*hidden !important;/,
  );
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen \.ant-card-body\s*\{[\s\S]*?min-height:\s*0;/,
  );
  assert.match(
    styles,
    /\.home-category-content-card:fullscreen \.codex-log-dashboard-shell\s*\{[\s\S]*min-height:\s*0;/,
  );
  assert.match(
    dashboard,
    /<OverlayScrollArea[\s\S]*?codex-log-dashboard-shell[\s\S]*?horizontal[\s\S]*?viewportClassName=/,
  );
  assert.match(overlayScrollbar, /export function OverlayScrollbar/);
  assert.match(overlayScrollbar, /new ResizeObserver/);
  assert.doesNotMatch(
    provider,
    /getComputedStyle|getBoundingClientRect|scrollHeight|clientHeight|scrollTop/,
  );
});
