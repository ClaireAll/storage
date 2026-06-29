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
  assert.doesNotMatch(
    dashboardSource,
    /stat\.label === "位置"[\s\S]*items-center justify-center/,
  );
  assert.doesNotMatch(dashboardSource, /w-full text-center/);
  assert.match(dashboardSource, /<div>\s*<Typography\.Text type="secondary">/);
});
