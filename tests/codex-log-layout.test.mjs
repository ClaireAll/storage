import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);
const homeStylePath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);
const fullscreenPath = new URL(
  "../src/app/(pages)/home/home-content-fullscreen.tsx",
  import.meta.url,
);
const homeViewPath = new URL(
  "../src/app/(pages)/home/home-view.tsx",
  import.meta.url,
);
const themeConstantsPath = new URL(
  "../src/app/(pages)/theme/constants.ts",
  import.meta.url,
);

test("keeps the Codex table tall while constraining it to fullscreen height", async () => {
  const [dashboardSource, fullscreenSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(fullscreenPath, "utf8"),
  ]);

  assert.match(fullscreenSource, /export function useHomeContentFullscreen/);
  assert.match(dashboardSource, /useHomeContentFullscreen\(\)/);
  assert.match(dashboardSource, /const tableScrollY = fullscreen\?\.isFullscreen/);
  assert.match(dashboardSource, /clamp\(260px, 36dvh, 440px\)/);
  assert.match(dashboardSource, /scroll=\{\{ x: 1170, y: tableScrollY \}\}/);
});

test("keeps the summary available without dashboard scroll render state", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.doesNotMatch(source, /onScroll=\{handleDashboardScroll\}/);
  assert.match(source, /codex-log-table-panel[^"`]*shrink-0/);
  assert.match(source, /codex-log-summary-panel[^"`]*shrink-0/);
});

test("uses the daily report symbol and keeps mobile toolbar actions compact", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /import \{ CategoryIcon \} from "@\/app\/\(pages\)\/common\/category-icon"/);
  assert.match(
    source,
    /inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-\[color-mix\(in_srgb,#18f83a_50%,transparent\)\] bg-\[color-mix\(in_srgb,#18f83a_14%,transparent\)\]/,
  );
  assert.match(
    source,
    /<CategoryIcon\s+className="size-7"\s+hasPadding=\{false\}\s+iconClassName="size-7"\s+mode="symbol"\s+name="icon-daily-report"\s+\/>/,
  );
  assert.match(
    source,
    /grid-cols-\[minmax\(0,1fr\)_40px\][^"`]*sm:grid-cols-\[160px_minmax\(160px,1fr\)_minmax\(180px,1\.2fr\)_40px\]/,
  );
  assert.match(source, /codex-log-date-picker col-span-2 w-full sm:col-span-1/);
  assert.match(source, /codex-log-repo-select col-span-2 w-full sm:col-span-1/);
  assert.match(source, /className="col-span-1 w-full sm:col-span-1"/);
});

test("stacks the toolbar until the dashboard has enough room beside the sidebar", async () => {
  const [source, homeStyleSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(homeStylePath, "utf8"),
  ]);

  assert.match(source, /codex-log-toolbar grid grid-cols-1[^"`]*2xl:flex 2xl:items-center 2xl:justify-between/);
  assert.match(source, /sm:grid-cols-\[160px_minmax\(160px,1fr\)_minmax\(180px,1\.2fr\)_40px\] 2xl:w-180/);
  assert.doesNotMatch(source, /xl:flex xl:items-center xl:justify-between/);
  assert.doesNotMatch(
    homeStyleSource,
    /@media \(min-width: 1280px\) \{\s+\.codex-log-toolbar/,
  );
});

test("uses the selected theme's eight chart columns for daily task bars", async () => {
  const [dashboardSource, homeViewSource, themeConstantsSource] =
    await Promise.all([
      readFile(dashboardPath, "utf8"),
      readFile(homeViewPath, "utf8"),
      readFile(themeConstantsPath, "utf8"),
    ]);
  const chartColumns = [
    ...themeConstantsSource.matchAll(/columns:\s*\[([^\]]*)\]/g),
  ];

  assert.equal(chartColumns.length, 20);
  chartColumns.forEach(([, colors]) => {
    assert.equal((colors.match(/#[0-9A-F]{6}/gi) ?? []).length, 8);
  });
  assert.match(homeViewSource, /getThemeColumns/);
  assert.match(
    homeViewSource,
    /"--home-theme-columns": homeThemeColumns\.join\(","\)/,
  );
  assert.match(dashboardSource, /columns:\s*getChartColumns\(/);
  assert.match(
    dashboardSource,
    /readVar\("--home-theme-columns", defaultPalette\.columns\.join\(","\)\)/,
  );
  assert.match(
    dashboardSource,
    /const chartColumns = getChartColumns\(palette\.columns\.join\(","\)\)/,
  );
  assert.match(
    dashboardSource,
    /itemStyle:\s*\{\s*color: chartColumns\[index % chartColumns\.length\],?\s*\}/,
  );
  assert.doesNotMatch(dashboardSource, /const taskBarColors/);
});

test("matches preset theme chart columns without color-case drift", async () => {
  const source = await readFile(themeConstantsPath, "utf8");

  assert.match(source, /function normalizeThemeColorForComparison/);
  assert.match(
    source,
    /normalizeThemeColorForComparison\(option\.bg\) ===\s*normalizeThemeColorForComparison\(value\.bg\)/,
  );
  assert.match(
    source,
    /normalizeThemeColorForComparison\(option\.color\) ===\s*normalizeThemeColorForComparison\(value\.color\)/,
  );
  assert.match(
    source,
    /normalizeThemeColorForComparison\(option\.text\) ===\s*normalizeThemeColorForComparison\(value\.text\)/,
  );
});

test("shows only task, Token, and repository metric cards", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /codex-log-metric-grid flex w-full flex-nowrap gap-3/);
  assert.match(source, /codex-log-metric-card flex-1 basis-0/);
  assert.doesNotMatch(source, /label="估算占比"/);
  assert.doesNotMatch(source, /icon="icon-proportion"/);
});
