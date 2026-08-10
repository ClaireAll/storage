import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scrollActivityProviderPath = new URL(
  "../src/app/(pages)/common/scroll-activity-provider.tsx",
  import.meta.url,
);
const globalStylesPath = new URL("../src/app/globals.css", import.meta.url);

test("keeps global scrollbars visible for two seconds after scrolling stops", async () => {
  const source = await readFile(scrollActivityProviderPath, "utf8");

  assert.equal(source.includes("const scrollActivityRetentionMs = 2_000;"), true);
  assert.equal(source.includes("}, scrollActivityRetentionMs);"), true);
});

test("uses the active theme color for visible global scrollbars", async () => {
  const source = await readFile(globalStylesPath, "utf8");

  assert.equal(source.includes("--storage-scrollbar-thumb-active: color-mix("), true);
  assert.equal(source.includes("--home-theme-color"), true);
  assert.equal(source.includes("var(--theme-page-color,"), true);
  assert.equal(
    source.includes("var(--home-theme-text, var(--foreground)) 30%"),
    false,
  );
});
