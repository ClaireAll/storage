import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);

async function readDashboardSource() {
  return readFile(dashboardPath, "utf8");
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
  const source = await readDashboardSource();

  assert.equal(
    source.includes("flex h-full min-h-0 flex-col overflow-hidden"),
    true,
  );
  assert.equal(
    source.includes(
      "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1 [scrollbar-gutter:stable]",
    ),
    true,
  );
  assert.equal(
    source.includes('className="home-category-menu !w-full min-w-0"'),
    true,
  );
});
