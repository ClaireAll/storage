import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const homeStylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);
const overlayScrollbarPath = new URL(
  "../src/app/(pages)/common/overlay-scrollbar.tsx",
  import.meta.url,
);

async function readDashboardSource() {
  return readFile(dashboardPath, "utf8");
}

async function readHomeStylesSource() {
  return readFile(homeStylesPath, "utf8");
}

test("keeps the Codex submenu user-controlled on an active child route", async () => {
  const source = await readDashboardSource();

  assert.equal(
    source.includes("setOpenCategoryKeys(keys.map(String));"),
    true,
  );
  assert.equal(source.includes("isCodexChildCategoryActive"), false);
  assert.equal(source.includes("effectiveOpenCategoryKeys"), false);
});

test("keeps the category menu vertically scrollable without horizontal overflow", async () => {
  const [source, overlayScrollbarSource] = await Promise.all([
    readDashboardSource(),
    readFile(overlayScrollbarPath, "utf8"),
  ]);

  assert.equal(
    source.includes("flex h-full min-h-0 flex-col overflow-hidden"),
    true,
  );
  assert.equal(
    source.includes("home-category-menu-scroll"),
    true,
  );
  assert.equal(
    source.includes("viewportClassName=\"home-category-menu-scroll overflow-x-hidden\""),
    true,
  );
  assert.equal(overlayScrollbarSource.includes('vertical && "overflow-y-auto"'), true);
  assert.equal(source.includes("scrollbar-gutter-stable"), false);
  assert.equal(
    source.includes('className="home-category-menu !w-full min-w-0"'),
    true,
  );
});

test("keeps collapsed category labels in Tooltip instead of native title", async () => {
  const source = await readDashboardSource();

  assert.equal(source.includes("title: child.label"), false);
  assert.equal(source.includes("title: category.label"), false);
});

test("keeps collapsed category menu spacing symmetrical", async () => {
  const source = await readDashboardSource();
  const styles = await readHomeStylesSource();

  assert.equal(
    source.includes("home-category-menu-scroll"),
    true,
  );
  assert.equal(
    source.includes('isCategorySidebarCollapsed ? "px-0" : "pr-1"'),
    true,
  );
  assert.equal(
    styles.includes(
      ".home-category-layout-collapsed .home-category-menu-scroll",
    ),
    false,
  );
  assert.equal(styles.includes("justify-content: center;"), true);
  assert.equal(styles.includes("padding-inline: 0 !important;"), true);
  assert.equal(
    styles.includes(
      ".home-category-layout-collapsed .home-category-menu-scroll::-webkit-scrollbar",
    ),
    false,
  );
  assert.equal(
    source.includes(
      '"min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1 scrollbar-gutter-stable"',
    ),
    false,
  );
});

test("keeps content fullscreen action out of the category navigation", async () => {
  const source = await readDashboardSource();

  assert.equal(source.includes("HomeContentFullscreenProvider"), true);
  assert.equal(source.includes("codex-log-fullscreen-menu-label"), false);
  assert.equal(source.includes("codex-log-fullscreen-button"), false);
  assert.equal(source.includes("全屏预览日报"), false);
  assert.equal(source.includes("全屏预览Codex日报"), false);
});

test("does not scale the Codex submenu when a child is active", async () => {
  const source = await readDashboardSource();
  const parentMenuItemSource = source.slice(
    source.indexOf("return {\n            className:"),
    source.indexOf("children: category.children"),
  );

  assert.equal(
    source.includes(
      "const isCategoryDirectActive = activeCategoryHref === category.href;",
    ),
    true,
  );
  assert.equal(source.includes("const hasActiveChild = Boolean("), false);
  assert.match(
    parentMenuItemSource,
    /"scale-110":\s+isCategoryDirectActive && !category\.children\?\.length,/,
  );
  assert.equal(source.includes('"font-bold": isCategoryDirectActive'), true);
  assert.equal(source.includes('"scale-110 font-bold": isCategoryActive'), false);
});

test("does not scale Codex child items while hovering the parent", async () => {
  const source = await readDashboardSource();
  const parentMenuItemSource = source.slice(
    source.indexOf("return {\n            className:"),
    source.indexOf("children: category.children"),
  );

  assert.equal(
    parentMenuItemSource.includes('"hover:scale-110": !category.children?.length'),
    true,
  );
  assert.equal(parentMenuItemSource.includes('cn("hover:scale-110"'), false);
});

test("edits category visibility from the expanded sidebar only", async () => {
  const source = await readDashboardSource();

  assert.equal(source.includes('name="icon-setting"'), true);
  assert.equal(source.includes("isCategoryVisibilityEditing"), true);
  assert.equal(source.includes('"icon-visible"'), true);
  assert.equal(source.includes('"icon-invisible"'), true);
  assert.equal(source.includes("onToggleCategoryVisibility"), true);
  assert.equal(source.includes("event.stopPropagation()"), true);
  assert.equal(source.includes("if (isCategoryVisibilityEditing)"), true);
  assert.equal(source.includes("hiddenCategoryKeys.includes(child.key)"), true);
});
