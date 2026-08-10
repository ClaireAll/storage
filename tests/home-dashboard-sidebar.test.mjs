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

test("gives the category menu its own vertical scroll viewport", async () => {
  const source = await readDashboardSource();

  assert.equal(
    source.includes("flex h-full min-h-0 flex-col overflow-hidden"),
    true,
  );
  assert.equal(
    source.includes(
      "min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]",
    ),
    true,
  );
});
