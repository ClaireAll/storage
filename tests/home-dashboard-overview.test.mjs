import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
function createHookHarness() {
  const values = [];
  let cursor = 0;

  return {
    beginRender() {
      cursor = 0;
    },
    react: {
      ...React,
      useCallback: (callback) => callback,
      useEffect: () => {},
      useMemo: (factory) => factory(),
      useRef: (value) => ({ current: value }),
      useState(initialValue) {
        const index = cursor++;
        if (!(index in values)) {
          values[index] =
            typeof initialValue === "function" ? initialValue() : initialValue;
        }

        return [
          values[index],
          (nextValue) => {
            values[index] =
              typeof nextValue === "function"
                ? nextValue(values[index])
                : nextValue;
          },
        ];
      },
    },
  };
}

function findElement(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (!React.isValidElement(node)) return undefined;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
}

async function loadHomeDashboard(hooks) {
  const source = await readFile(
    new URL(
      "../src/app/(pages)/home/home-dashboard.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (id) => {
    if (id === "react") return hooks.react;
    if (id === "@ant-design/icons") {
      return new Proxy({}, { get: (_, name) => String(name) });
    }
    if (id === "antd") {
      return {
        Button: "Button",
        Card: "Card",
        Cascader: "Cascader",
        Menu: "Menu",
        Spin: "Spin",
        Tooltip: "Tooltip",
        Typography: { Text: "Typography.Text", Title: "Typography.Title" },
      };
    }
    if (id === "@/app/(pages)/common/category-icon") {
      return { CategoryIcon: "CategoryIcon" };
    }
    if (id === "@/app/(pages)/common/overlay-scrollbar") {
      return { OverlayScrollArea: "OverlayScrollArea" };
    }
    if (id === "@/lib/utils") {
      return {
        cn: (...values) => values.filter((value) => typeof value === "string").join(" "),
      };
    }
    if (id === "./constant") {
      return {
        homeCategories: [
          {
            children: [
              {
                href: "/home/codex-log",
                key: "daily-report",
                label: "日报",
              },
              {
                href: "/home/codex-plugin",
                key: "plugin",
                label: "Plugin",
              },
              {
                href: "/home/codex-skills",
                key: "skills",
                label: "Skills",
              },
            ],
            href: "codex",
            key: "codex",
            label: "Codex",
          },
        ],
        homeStats: [
          { label: "文章推荐" },
          { label: "位置" },
          { label: "快捷功能" },
        ],
      };
    }
    if (id === "./home-content-fullscreen") {
      return { HomeContentFullscreenProvider: "HomeContentFullscreenProvider" };
    }
    if (id === "./home-utils") {
      return {
        fetchTodayWeather: async () => ({}),
        resolveCurrentWeatherLocation: async () => undefined,
        resolveWeatherLocationByAreaPath: () => undefined,
        weatherAreaOptions: [],
      };
    }
    return require(id);
  };

  Function("require", "module", "exports", compiled)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports.HomeDashboard;
}

test("overview cards expose animatable expanded and collapsed states", async () => {
  const hooks = createHookHarness();
  const HomeDashboard = await loadHomeDashboard(hooks);
  const baseProps = {
    hiddenCategoryKeys: [],
    isCategoryContentLoading: false,
    isCategoryVisibilityEditing: false,
    itemCount: 0,
    onCancelCategoryVisibilityEditing: () => {},
    onCategoryNavigate: () => {},
    onFinishCategoryVisibilityEditing: () => {},
    onOpenQuickItemCreate: () => {},
    onStartCategoryVisibilityEditing: () => {},
    onToggleCategoryVisibility: () => {},
    surfaceBackground: "#ffffff",
    surfaceBorderColor: "#dddddd",
  };
  const render = (isOverviewCollapsed) => {
    hooks.beginRender();
    return HomeDashboard({ ...baseProps, isOverviewCollapsed });
  };

  let dashboard = render(false);
  let overview = findElement(
    dashboard,
    (element) => element.props.id === "home-dashboard-overview",
  );
  assert.ok(overview);
  assert.equal(overview.props["aria-hidden"], false);
  assert.equal(overview.props["data-overview-state"], "expanded");
  dashboard = render(true);
  overview = findElement(
    dashboard,
    (element) => element.props.id === "home-dashboard-overview",
  );
  assert.ok(overview);
  assert.equal(overview.props["aria-hidden"], true);
  assert.equal(overview.props["data-overview-state"], "collapsed");
});

test("simple pull cord stays at the right edge and requests one toggle per click", async () => {
  const hooks = createHookHarness();
  const HomeDashboard = await loadHomeDashboard(hooks);
  let toggleCount = 0;
  const baseProps = {
    hiddenCategoryKeys: [],
    isCategoryContentLoading: false,
    isCategoryVisibilityEditing: false,
    itemCount: 0,
    onCancelCategoryVisibilityEditing: () => {},
    onCategoryNavigate: () => {},
    onFinishCategoryVisibilityEditing: () => {},
    onOpenQuickItemCreate: () => {},
    onStartCategoryVisibilityEditing: () => {},
    onToggleCategoryVisibility: () => {},
    onToggleOverview: () => {
      toggleCount += 1;
    },
    surfaceBackground: "#ffffff",
    surfaceBorderColor: "#dddddd",
  };
  const render = (isOverviewCollapsed) => {
    hooks.beginRender();
    return HomeDashboard({ ...baseProps, isOverviewCollapsed });
  };

  let dashboard = render(false);
  let toggle = findElement(
    dashboard,
    (element) => element.props["data-overview-toggle"] === "pull-cord",
  );
  assert.ok(toggle);
  assert.equal(toggle.props["aria-controls"], "home-dashboard-overview");
  assert.equal(toggle.props["aria-expanded"], true);
  const toggleClasses = new Set(toggle.props.className.split(/\s+/));
  assert.ok(toggleClasses.has("absolute!"));
  assert.ok(toggleClasses.has("top-0"));
  assert.ok(toggleClasses.has("right-2"));
  assert.ok(toggleClasses.has("h-24!"));
  assert.ok(toggleClasses.has("w-11!"));
  assert.equal(toggleClasses.has("max-md:hidden"), false);
  const graphic = findElement(toggle, (element) => element.type === "svg");
  assert.ok(graphic);
  assert.equal(graphic.props.viewBox, "0 0 44 96");
  const cord = findElement(
    toggle,
    (element) =>
      typeof element.props.className === "string" &&
      element.props.className.includes("home-overview-pull-cord-line"),
  );
  assert.ok(cord);
  assert.equal(cord.type, "line");
  assert.equal(cord.props.strokeDasharray, undefined);
  const handle = findElement(
    toggle,
    (element) =>
      typeof element.props.className === "string" &&
      element.props.className.includes("home-overview-pull-cord-handle"),
  );
  assert.ok(handle);
  assert.equal(handle.type, "circle");
  assert.equal(handle.props.r, "6");
  assert.equal(findElement(toggle, (element) => element.type === "path"), undefined);
  toggle.props.onClick();
  assert.equal(toggleCount, 1);

  dashboard = render(true);
  toggle = findElement(
    dashboard,
    (element) => element.props["data-overview-toggle"] === "pull-cord",
  );
  assert.ok(toggle);
  assert.equal(toggle.props["aria-expanded"], false);
});

test("home header leaves overview toggling to the right-edge pull switch", async () => {
  const source = await readFile(
    new URL("../src/app/(pages)/home/home-view.tsx", import.meta.url),
    "utf8",
  );
  const sourceFile = ts.createSourceFile(
    "home-view.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let overviewControlCount = 0;

  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.text === "aria-controls" &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text === "home-dashboard-overview"
    ) {
      overviewControlCount += 1;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  assert.equal(overviewControlCount, 0);
});

test("collapsed category submenu keeps its item labels visible", async () => {
  const hooks = createHookHarness();
  const HomeDashboard = await loadHomeDashboard(hooks);
  const baseProps = {
    hiddenCategoryKeys: [],
    isCategoryContentLoading: false,
    isCategoryVisibilityEditing: false,
    isOverviewCollapsed: true,
    itemCount: 0,
    onCancelCategoryVisibilityEditing: () => {},
    onCategoryNavigate: () => {},
    onFinishCategoryVisibilityEditing: () => {},
    onOpenQuickItemCreate: () => {},
    onStartCategoryVisibilityEditing: () => {},
    onToggleCategoryVisibility: () => {},
    onToggleOverview: () => {},
    surfaceBackground: "#ffffff",
    surfaceBorderColor: "#dddddd",
  };
  const render = () => {
    hooks.beginRender();
    return HomeDashboard(baseProps);
  };

  let dashboard = render();
  const collapseButton = findElement(
    dashboard,
    (element) => element.props["aria-label"] === "收起分类",
  );
  assert.ok(collapseButton);
  collapseButton.props.onClick();

  dashboard = render();
  const menu = findElement(dashboard, (element) => element.type === "Menu");
  assert.ok(menu);
  assert.equal(menu.props.inlineCollapsed, true);
  assert.deepEqual(
    menu.props.items[0].children.map((item) => item.label),
    ["日报", "Plugin", "Skills"],
  );
});
