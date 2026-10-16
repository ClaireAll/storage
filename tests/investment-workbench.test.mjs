import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const categoryPath = new URL(
  "../src/app/(pages)/home/constant.ts",
  import.meta.url,
);
const databasePath = new URL("../src/app/utils/database.ts", import.meta.url);
const dashboardPath = new URL(
  "../src/app/(pages)/home/investment/investment-dashboard.tsx",
  import.meta.url,
);
const detailPath = new URL("../src/app/(pages)/home/investment/investment-detail-panel.tsx", import.meta.url);
const pagePath = new URL(
  "../src/app/(pages)/home/investment/page.tsx",
  import.meta.url,
);
const routePath = new URL(
  "../src/app/api/investment/route.ts",
  import.meta.url,
);
const dataPath = new URL(
  "../src/app/(pages)/home/investment/investment-data.ts",
  import.meta.url,
);
const rulesPath = new URL(
  "../src/app/(pages)/home/investment/investment-rules.md",
  import.meta.url,
);
const notificationRoutePath = new URL(
  "../src/app/api/investment/notification/route.ts",
  import.meta.url,
);
const notificationMigrationPath = new URL(
  "../supabase/migrations/20260813_create_investment_notifications.sql",
  import.meta.url,
);
const homeStylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);
const homeDashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const homeViewPath = new URL(
  "../src/app/(pages)/home/home-view.tsx",
  import.meta.url,
);

test("adds the investment category and renders its own dashboard route", async () => {
  const [categorySource, pageSource] = await Promise.all([
    readFile(categoryPath, "utf8"),
    readFile(pagePath, "utf8"),
  ]);

  assert.match(categorySource, /href: "\/home\/investment"/);
  assert.match(categorySource, /key: "investment"/);
  assert.match(pageSource, /activeCategoryHref: "\/home\/investment"/);
  assert.match(pageSource, /<InvestmentDashboard/);
});

test("uses the supplied icons for investment navigation and instruments", async () => {
  const [categorySource, dashboardSource] = await Promise.all([
    readFile(categoryPath, "utf8"),
    readFile(dashboardPath, "utf8"),
  ]);

  assert.match(
    categorySource,
    /href: "\/home\/investment",\s*iconClassName: "icon-investment"/,
  );
  assert.match(dashboardSource, /name="icon-investment"/);
  assert.match(
    dashboardSource,
    /function InvestmentInstrumentIcon[\s\S]*?"icon-fund"[\s\S]*?"icon-stock"/,
  );
  assert.match(
    dashboardSource,
    /<InvestmentInstrumentIcon instrumentType=\{item\.instrumentType\}/,
  );
  assert.doesNotMatch(dashboardSource, /(?:投资|项目)图标预留/);
});

test("keeps investment controls responsive and available in fullscreen", async () => {
  const [dashboardSource, homeDashboardSource, homeViewSource] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(homeDashboardPath, "utf8"),
    readFile(homeViewPath, "utf8"),
  ]);
  const watchlistRowSource =
    dashboardSource.match(/function WatchlistRow[\s\S]*?function RecommendationPanel/)?.[0] ??
    "";

  assert.match(
    dashboardSource,
    /from "\.\.\/home-content-fullscreen"/,
  );
  assert.match(dashboardSource, /<HomeContentFullscreenButton \/>/);
  assert.match(
    dashboardSource,
    /investment-dashboard-grid[^"]*grid-cols-1[^"\n]*@min-\[900px\]\/investment-workspace:grid-cols-/,
  );
  assert.match(
    dashboardSource,
    /@container\/investment-workspace/,
  );
  assert.match(
    watchlistRowSource,
    /aria-pressed=\{selected\}/,
  );
  assert.match(watchlistRowSource, /onClick=\{onSelect\}/);
  assert.match(watchlistRowSource, /focus-visible:outline/);
  assert.match(watchlistRowSource, /aria-label=\{`删除/);
  assert.match(dashboardSource, /<InvestmentDetailPanel item=\{selectedItem\}/);
  assert.match(dashboardSource, /iconClassName="text-xl text-red-500"/);
  assert.match(
    homeDashboardSource,
    /has-data-investment-dashboard:max-\[1180px\]:overflow-visible/,
  );
  assert.match(
    homeViewSource,
    /has-data-investment-dashboard:max-\[1180px\]:overflow-visible/,
  );
});

test("keeps investment watchlist access scoped to the signed-in user", async () => {
  const [databaseSource, routeSource] = await Promise.all([
    readFile(databasePath, "utf8"),
    readFile(routePath, "utf8"),
  ]);

  assert.match(databaseSource, /from\("investment"\)/);
  assert.match(databaseSource, /eq\("user_id", userId\)/);
  assert.match(routeSource, /auth\(\)/);
  assert.match(routeSource, /instrument_type/);
  assert.match(routeSource, /instrument_order/);
  assert.match(routeSource, /instrument_code/);
  assert.match(routeSource, /createAdminClient/);
});

test("implements filtering, drag sorting, recommendations, and state-aware data labels", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const detail = await readFile(detailPath, "utf8");

  assert.match(source, /Segmented/);
  assert.match(source, /onDragStart/);
  assert.match(source, /onDrop/);
  assert.match(source, /候选观察/);
  assert.match(source, /板块信号/);
  assert.match(detail, /规则预测/);
  assert.match(source, /规则 MD/);
  assert.match(source, /公开行情/);
  assert.match(detail, /role="img"/);
  assert.match(detail, /echarts/);
  assert.match(source, /企微机器人通知/);
});

test("uses shared preview border tokens for investment surfaces", async () => {
  const [dashboardSource, styles] = await Promise.all([
    readFile(dashboardPath, "utf8"),
    readFile(homeStylesPath, "utf8"),
  ]);

  assert.match(styles, /\.home-preview-panel\s*\{/);
  assert.match(styles, /\.home-preview-divider\s*\{/);
  assert.match(
    styles,
    /\.home-preview-divide-y > :not\(\[hidden\]\) ~ :not\(\[hidden\]\)\s*\{[\s\S]*border-color:\s*var\(--home-preview-divider-color\) !important;/,
  );
  assert.match(dashboardSource, /home-preview-panel/);
  assert.match(dashboardSource, /home-preview-divider/);
  assert.match(dashboardSource, /home-preview-divide-y/);
  assert.match(dashboardSource, /const investmentPanelClassName =/);
  assert.match(dashboardSource, /rounded-xl border bg-\[color-mix\(in_srgb,var\(--home-theme-bg\)_18%,#ffffff_82%\)\]/);
  assert.match(dashboardSource, /dark:bg-\[color-mix\(in_srgb,var\(--home-theme-bg\)_88%,#ffffff_12%\)\]/);
  assert.match(dashboardSource, /const investmentMutedTextClassName =/);
  assert.match(dashboardSource, /const investmentFaintTextClassName =/);
  assert.match(dashboardSource, /var\(--home-theme-color\)/);
  assert.doesNotMatch(
    dashboardSource,
    /(?:border|divide)-black\/(?:7|8)|dark:(?:border|divide)-white\/(?:10|12)/,
  );
  assert.doesNotMatch(dashboardSource, /bg-white\/55|bg-white\/45|dark:bg-black\/10/);
});

test("uses code-maintained rules and does not present unavailable public data as live", async () => {
  const [dataSource, rulesSource] = await Promise.all([
    readFile(dataPath, "utf8"),
    readFile(rulesPath, "utf8"),
  ]);

  assert.match(dataSource, /investment-rules\.md/);
  assert.match(dataSource, /getInvestmentEvidence/);
  assert.match(dataSource, /getFallbackSectorSignals/);
  assert.match(dataSource, /getInvestmentQuotes/);
  assert.match(rulesSource, /公开来源/);
  assert.match(rulesSource, /不构成投资建议/);
});

test("keeps the WeCom webhook server-side and scopes notification settings to one user", async () => {
  const [routeSource, migrationSource] = await Promise.all([
    readFile(notificationRoutePath, "utf8"),
    readFile(notificationMigrationPath, "utf8"),
  ]);

  assert.match(routeSource, /auth\(\)/);
  assert.match(routeSource, /investment_notifications/);
  assert.match(routeSource, /user_id/);
  assert.match(routeSource, /webhook_url/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /investment_notifications_manage_own/);
});
