import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constantSource = readFileSync(
  new URL("../src/app/(pages)/home/constant.ts", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("../src/app/(pages)/home/home-dashboard.tsx", import.meta.url),
  "utf8",
);
const homeViewSource = readFileSync(
  new URL("../src/app/(pages)/home/home-view.tsx", import.meta.url),
  "utf8",
);
const utilsSource = readFileSync(
  new URL("../src/app/(pages)/home/home-utils.ts", import.meta.url),
  "utf8",
);

test("top home cards put weather before quick actions", () => {
  const articleIndex = constantSource.indexOf('label: "文章推荐"');
  const weatherIndex = constantSource.indexOf('label: "位置"');
  const quickIndex = constantSource.indexOf('label: "快捷功能"');

  assert.ok(articleIndex >= 0, "article card label exists");
  assert.ok(weatherIndex >= 0, "weather card label exists");
  assert.ok(quickIndex >= 0, "quick action card label exists");
  assert.ok(articleIndex < weatherIndex);
  assert.ok(weatherIndex < quickIndex);
});

test("weather card uses the original non-centered card layout", () => {
  const weatherBranchStart = dashboardSource.indexOf('stat.label === "位置"');
  const weatherBranchEnd = dashboardSource.indexOf(
    "\n              ) : null}",
    weatherBranchStart,
  );
  const weatherBranch = dashboardSource.slice(
    weatherBranchStart,
    weatherBranchEnd,
  );

  assert.doesNotMatch(weatherBranch, /items-center justify-center/);
  assert.doesNotMatch(dashboardSource, /w-full text-center/);
  assert.match(dashboardSource, /<div>\s*<Typography\.Text type="secondary">/);
});

test("recommendations and weather initialize once and survive route remounts", () => {
  assert.match(dashboardSource, /const homeDashboardCache/);
  assert.match(dashboardSource, /hasInitializedKnowledge/);
  assert.match(dashboardSource, /hasInitializedWeather/);
  assert.match(
    dashboardSource,
    /useState<KnowledgeItem\[\]>\([\s\S]*\(\) => homeDashboardCache\.knowledgeItems[\s\S]*\)/,
  );
  assert.match(
    dashboardSource,
    /useState<WeatherState>\([\s\S]*\(\) => homeDashboardCache\.weather[\s\S]*\)/,
  );
  assert.match(
    dashboardSource,
    /if \(homeDashboardCache\.hasInitializedKnowledge\)/,
  );
  assert.match(
    dashboardSource,
    /if \(homeDashboardCache\.hasInitializedWeather\)/,
  );
});

test("current weather location resolves a concrete place label before display", () => {
  assert.match(dashboardSource, /resolveCurrentWeatherLocation/);
  assert.match(
    dashboardSource,
    /const location = await resolveCurrentWeatherLocation\(coords\)/,
  );
  assert.match(dashboardSource, /const locationLabel = location\.label/);
  assert.match(utilsSource, /reverse-geocode-client/);
  assert.match(
    utilsSource,
    /`纬度 \$\{latitude\.toFixed\(4\)\}，经度 \$\{longitude\.toFixed\(4\)\}`/,
  );
  assert.doesNotMatch(dashboardSource, /const nextAreaPath = \["当前位置"\]/);
  assert.doesNotMatch(dashboardSource, /name: "当前位置"/);
});

test("category navigation switches selection immediately and shows a content spin", () => {
  assert.match(homeViewSource, /pendingCategoryHref/);
  assert.match(homeViewSource, /startCategoryTransition/);
  assert.match(homeViewSource, /router\.push\(categoryHref\)/);
  assert.match(
    homeViewSource,
    /activeCategoryHref=\{displayActiveCategoryHref\}/,
  );
  assert.match(
    homeViewSource,
    /isCategoryContentLoading=\{isCategoryContentLoading\}/,
  );
  assert.match(dashboardSource, /Spin/);
  assert.match(dashboardSource, /isCategoryContentLoading/);
  assert.match(dashboardSource, /onCategoryNavigate\(String\(key\)\)/);
  assert.doesNotMatch(dashboardSource, /import Link from "next\/link"/);
});
