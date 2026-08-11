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

test("keeps dashboard scrolling outside React render state", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.doesNotMatch(source, /isDashboardScrolling/);
  assert.doesNotMatch(source, /onScroll=\{handleDashboardScroll\}/);
});

test("reuses the active scroll container before measuring layout again", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /activeScrollTarget === target/);
  assert.match(source, /refreshScrollRetention\(\);\s*return;/);
});

test("shows the active scrollbar without component-local listeners", async () => {
  const source = await readFile(globalsPath, "utf8");

  assert.match(source, /\.storage-is-vertically-scrolling::\-webkit-scrollbar/);
  assert.match(
    source,
    /\.storage-is-vertically-scrolling::\-webkit-scrollbar-thumb/,
  );
});
