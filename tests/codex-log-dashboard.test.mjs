import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path) {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

const packageSource = readSource("../package.json");
const constantSource = readSource("../src/app/(pages)/home/constant.ts");
const pageSource = readSource("../src/app/(pages)/home/codex-log/page.tsx");
const dashboardSource = readSource(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
);
const utilsSource = readSource(
  "../src/app/(pages)/home/codex-log/codex-log-utils.ts",
);
const summaryRouteSource = readSource(
  "../src/app/api/codex-log/summary/route.ts",
);
const homeStyleSource = readSource(
  "../src/app/(pages)/theme/styles/home.less",
);
const homeDashboardSource = readSource(
  "../src/app/(pages)/home/home-dashboard.tsx",
);

test("home category list contains Codex daily report with provided icon", () => {
  assert.match(
    constantSource,
    /href:\s*"\/home\/codex-log"[\s\S]*iconClassName:\s*"icon-codex"[\s\S]*label:\s*"Codex日报"/,
  );
});

test("Codex daily dashboard page reads codex_log and renders the dashboard", () => {
  assert.match(pageSource, /activeCategoryHref:\s*"\/home\/codex-log"/);
  assert.match(pageSource, /listCodexLogDashboard/);
  assert.match(pageSource, /<CodexLogDashboard/);
  assert.match(utilsSource, /from\("codex_log"\)/);
  assert.match(utilsSource, /thread_title/);
  assert.match(utilsSource, /assistant_summary/);
  assert.match(utilsSource, /token_count/);
});

test("Codex daily dashboard uses ECharts and the provided metric icons", () => {
  assert.match(packageSource, /"echarts"/);
  assert.match(dashboardSource, /echarts\/core/);
  assert.match(dashboardSource, /BarChart/);
  assert.match(dashboardSource, /LineChart/);
  assert.match(dashboardSource, /PieChart/);
  assert.match(dashboardSource, /icon-task/);
  assert.match(dashboardSource, /icon-store/);
  assert.match(dashboardSource, /icon-proportion/);
  assert.match(dashboardSource, /icon-token/);
  assert.match(dashboardSource, /icon-codex/);
});

test("Codex conversation table supports time and token filtering without excerpt or type column", () => {
  assert.match(dashboardSource, /title:\s*"时间"/);
  assert.match(dashboardSource, /dataIndex:\s*"time"/);
  assert.match(dashboardSource, /title:\s*"Token"/);
  assert.match(dashboardSource, /dataIndex:\s*"token_count"/);
  assert.match(dashboardSource, /filters:\s*hourFilters/);
  assert.match(dashboardSource, /filters:\s*tokenFilters/);
  assert.doesNotMatch(dashboardSource, /节选/);
  assert.doesNotMatch(dashboardSource, /title:\s*"类型"/);
});

test("Codex dashboard summary module calls DeepSeek and shows summary growth shortage", () => {
  assert.match(dashboardSource, /codex-log-summary-panel/);
  assert.match(dashboardSource, /\/api\/codex-log\/summary/);
  assert.match(dashboardSource, /总结/);
  assert.match(dashboardSource, /成长/);
  assert.match(dashboardSource, /不足/);
  assert.match(summaryRouteSource, /process\.env\.DEEPSEEK_API_KEY/);
  assert.match(summaryRouteSource, /deepseek-v4-flash/);
  assert.match(summaryRouteSource, /summary/);
  assert.match(summaryRouteSource, /growth/);
  assert.match(summaryRouteSource, /shortage/);
});

test("Codex dashboard summary prompt analyzes the user instead of Codex", () => {
  assert.match(summaryRouteSource, /复盘对象是用户本人/);
  assert.match(summaryRouteSource, /Codex 只是工具或协作对象/);
  assert.match(summaryRouteSource, /不要评价 Codex/);
});

test("Codex token metric makes the imported data source explicit", () => {
  assert.match(utilsSource, /readCodexDesktopUsageTotals/);
  assert.match(utilsSource, /sessions/);
  assert.match(utilsSource, /archived_sessions/);
  assert.match(utilsSource, /last_token_usage/);
  assert.match(utilsSource, /total_tokens/);
  assert.match(utilsSource, /for await \(const line of lines\)/);
  assert.doesNotMatch(utilsSource, /date\(updated_at/);
  assert.match(utilsSource, /tokenSource:\s*desktopUsageTotals/);
  assert.match(dashboardSource, /data\.stats\.tokenSource === "desktop"/);
  assert.match(dashboardSource, /Codex 桌面 usage 聚合/);
});

test("Codex conversation table keeps overflow inside the table panel", () => {
  assert.match(dashboardSource, /className=\{cn\("codex-log-table"/);
  assert.match(dashboardSource, /tableLayout="fixed"/);
  assert.match(dashboardSource, /scroll=\{\{ x: 848, y: 220 \}\}/);
  assert.match(dashboardSource, /pagination=\{false\}/);
  assert.match(dashboardSource, /<Pagination/);
  assert.match(dashboardSource, /showSizeChanger/);
  assert.match(dashboardSource, /overflow-auto/);
});

test("Codex dashboard defines custom theme-aware scrollbars", () => {
  assert.match(dashboardSource, /\[\&::\-webkit\-scrollbar\]/);
  assert.match(dashboardSource, /\[\&::\-webkit\-scrollbar\-thumb\]/);
  assert.match(dashboardSource, /\[scrollbar\-width:thin\]/);
  assert.match(dashboardSource, /var\(--home-theme-color\)/);
});

test("high frequency and longest session panels do not render more links", () => {
  assert.match(dashboardSource, /最长会话/);
  assert.doesNotMatch(dashboardSource, /高频任务/);
  assert.doesNotMatch(dashboardSource, /更多/);
});

test("Codex dashboard uses a three-column second row with longest session", () => {
  assert.match(dashboardSource, /codex-log-analysis-grid/);
  assert.match(dashboardSource, /grid-cols-\[minmax\(0,1\.2fr\)_minmax\(260px,0\.8fr\)_minmax\(260px,0\.8fr\)\]/);
  assert.match(dashboardSource, /任务与Token趋势/);
  assert.match(dashboardSource, /仓库占比/);
  assert.match(dashboardSource, /最长会话/);
});

test("Codex dashboard places summary at the bottom in three columns", () => {
  assert.match(dashboardSource, /<SummaryPanel date=\{data\.selectedDate\} \/>[\s\S]*<\/div>/);
  assert.match(dashboardSource, /codex-log-summary-grid[\s\S]*grid-cols-3/);
});

test("Codex metric cards use inline Tailwind tones matching the provided icons", () => {
  assert.match(dashboardSource, /tone="task"/);
  assert.match(dashboardSource, /tone="store"/);
  assert.match(dashboardSource, /tone="proportion"/);
  assert.match(dashboardSource, /tone="token"/);
  assert.match(dashboardSource, /icon\-task/);
  assert.match(dashboardSource, /icon\-store/);
  assert.match(dashboardSource, /icon\-proportion/);
  assert.match(dashboardSource, /icon\-token/);
  assert.match(dashboardSource, /metricToneClassNames\[tone\]\.card/);
  assert.match(dashboardSource, /metricToneClassNames\[tone\]\.value/);
  assert.match(dashboardSource, /#22d3ee/);
  assert.match(dashboardSource, /#a855f7/);
  assert.match(dashboardSource, /#f59e0b/);
  assert.match(dashboardSource, /#22c55e/);
  assert.match(dashboardSource, /#18f83a/);
});

test("Codex dashboard styles are theme-aware for dark and light modes", () => {
  assert.match(homeStyleSource, /codex-log-dashboard/);
  assert.match(homeStyleSource, /var\(--home-theme-bg\)/);
  assert.match(homeStyleSource, /var\(--home-theme-text\)/);
  assert.match(homeStyleSource, /var\(--home-theme-color\)/);
  assert.match(homeStyleSource, /\.theme-dark[\s\S]*codex-log/);
  assert.match(homeStyleSource, /color-mix/);
});

test("Codex daily report category can open the dashboard content in fullscreen", () => {
  assert.match(homeDashboardSource, /codex-log-fullscreen-menu-label/);
  assert.match(homeDashboardSource, /codex-log-fullscreen-button/);
  assert.match(homeDashboardSource, /icon-fullscreen/);
  assert.match(homeDashboardSource, /requestFullscreen\(\)/);
  assert.match(homeDashboardSource, /stopPropagation\(\)/);
  assert.match(homeDashboardSource, /aria-label="全屏预览Codex日报"/);
  assert.match(homeStyleSource, /home-category-content-card:fullscreen/);
  assert.match(homeStyleSource, /codex-log-dashboard-fullscreen/);
});
