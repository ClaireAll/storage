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
  assert.match(dashboardSource, /label="入库Token"/);
  assert.match(dashboardSource, /hint="来自 codex_log\.token_count/);
});

test("Codex conversation table keeps overflow inside the table panel", () => {
  assert.match(dashboardSource, /className="codex-log-table"/);
  assert.match(dashboardSource, /tableLayout="fixed"/);
  assert.match(dashboardSource, /scroll=\{\{ x: "max-content" \}\}/);
  assert.match(homeStyleSource, /\.codex-log-table-panel[\s\S]*overflow: hidden/);
  assert.match(homeStyleSource, /\.codex-log-dashboard \.ant-table-content[\s\S]*overflow: auto/);
});

test("Codex dashboard defines custom theme-aware scrollbars", () => {
  assert.match(homeStyleSource, /scrollbar-color:/);
  assert.match(homeStyleSource, /::-webkit-scrollbar/);
  assert.match(homeStyleSource, /::-webkit-scrollbar-thumb/);
  assert.match(homeStyleSource, /var\(--home-theme-color\)/);
});

test("high frequency and longest session panels do not render more links", () => {
  assert.match(dashboardSource, /高频任务/);
  assert.match(dashboardSource, /最长会话/);
  assert.doesNotMatch(dashboardSource, /更多/);
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
