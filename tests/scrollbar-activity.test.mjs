import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scrollActivityProviderPath = new URL(
  "../src/app/(pages)/common/scroll-activity-provider.tsx",
  import.meta.url,
);
const globalStylesPath = new URL("../src/app/globals.css", import.meta.url);
const themeShellBackgroundPath = new URL(
  "../src/app/(pages)/theme/theme-shell-background.tsx",
  import.meta.url,
);

test("keeps global scrollbars visible for two seconds after scrolling stops", async () => {
  const source = await readFile(scrollActivityProviderPath, "utf8");

  assert.equal(source.includes("const scrollActivityRetentionMs = 2_000;"), true);
  assert.equal(source.includes("}, scrollActivityRetentionMs);"), true);
});

test("uses the active theme color for visible global scrollbars", async () => {
  const source = await readFile(globalStylesPath, "utf8");

  assert.equal(
    source.includes(
      "html.storage-is-scrolling,\nhtml.storage-is-scrolling * {\n  --storage-scrollbar-thumb: color-mix(",
    ),
    true,
  );
  assert.equal(
    source.includes("var(--storage-scrollbar-color, var(--primary))"),
    true,
  );
  assert.equal(
    source.includes(
      "background-color: var(--storage-scrollbar-thumb) !important;",
    ),
    true,
  );
  assert.equal(
    source.includes("var(--home-theme-text, var(--foreground)) 30%"),
    false,
  );
});

test("publishes the active theme color to the root scrollbar scope", async () => {
  const source = await readFile(themeShellBackgroundPath, "utf8");

  assert.equal(source.includes("scrollbarColor?: string;"), true);
  assert.equal(
    source.includes('"--storage-scrollbar-color", scrollbarColor ?? color'),
    true,
  );
  assert.equal(
    source.includes("previousScrollbarColor"),
    true,
  );
});
