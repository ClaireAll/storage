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
const baseTextureStylesPath = new URL(
  "../src/app/(pages)/theme/styles/base-texture.less",
  import.meta.url,
);
const geometryTexturePath = new URL(
  "../src/app/(pages)/theme/theme-geometry-texture.tsx",
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

test("does not resize the scrollport while marking scrolling activity", async () => {
  const source = await readFile(globalsPath, "utf8");

  assert.match(source, /::\-webkit-scrollbar\s*\{[^}]*height:\s*0;[^}]*width:\s*0;/s);
  assert.doesNotMatch(source, /\.storage-is-vertically-scrolling::\-webkit-scrollbar/);
  assert.doesNotMatch(
    source,
    /\.storage-is-vertically-scrolling\s*\{[^}]*scrollbar-width/s,
  );
});

test("keeps the fullscreen dashboard scrollable without reserving a scrollbar gutter", async () => {
  const source = await readFile(homeStylesPath, "utf8");

  assert.match(
    source,
    /:fullscreen \.codex-log-dashboard\s*\{[^}]*overflow-y:\s*auto !important;/s,
  );
  assert.doesNotMatch(
    source,
    /:fullscreen \.codex-log-dashboard\s*\{[^}]*scrollbar-gutter:\s*stable/s,
  );
});

test("keeps Codex table scrolling overlay-only", async () => {
  const source = await readFile(homeStylesPath, "utf8");

  assert.doesNotMatch(
    source,
    /\.codex-log-dashboard \.ant-table-(?:content|body)[\s\S]*scrollbar-width:\s*thin/,
  );
  assert.doesNotMatch(
    source,
    /\.codex-log-dashboard \.ant-table-(?:content|body)[\s\S]*::-webkit-scrollbar[\s\S]*?(?:height|width):\s*8px/,
  );
});

test("pauses shared theme drawing during fullscreen dashboard scrolling", async () => {
  const source = await readFile(baseTextureStylesPath, "utf8");

  assert.match(
    source,
    /body:has\(\s*\.home-category-content-card:fullscreen\s+\.codex-log-dashboard\.storage-is-vertically-scrolling\s*\)\s+\.theme-shared-texture-root\s*\{[^}]*visibility:\s*hidden/s,
  );
  assert.match(
    source,
    /body:has\(\s*\.home-category-content-card:fullscreen\s+\.codex-log-dashboard\.storage-is-vertically-scrolling\s*\)\s+\.app-textured-shell::before,[\s\S]*visibility:\s*hidden/s,
  );
});

test("does not poll geometry bounds while the dashboard is scrolling", async () => {
  const source = await readFile(geometryTexturePath, "utf8");

  assert.doesNotMatch(source, /getBoundingClientRect/);
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /setTimeout/);
  assert.doesNotMatch(source, /onAnimationEnd=/);
  assert.match(source, /Array\.from\(\{ length: itemCount \}/);
});
