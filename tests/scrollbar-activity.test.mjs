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

test("keeps vertical scroll activity tracking lightweight", async () => {
  const source = await readFile(scrollActivityProviderPath, "utf8");

  assert.equal(source.includes("const scrollActivityRetentionMs = 2_000;"), true);
  assert.equal(
    source.includes(
      'const verticalScrollActiveClassName = "storage-is-vertically-scrolling";',
    ),
    true,
  );
  assert.equal(source.includes("activeScrollContainer"), true);
  assert.equal(source.includes("getScrollContainer"), true);
  assert.equal(source.includes("}, scrollActivityRetentionMs);"), true);
  assert.equal(source.includes("storage-is-scrolling"), false);
  assert.equal(source.includes('window.addEventListener("wheel"'), false);
  assert.equal(source.includes("event.target instanceof HTMLIFrameElement"), true);
});

test("prevents scrollbars from reserving layout space", async () => {
  const source = await readFile(globalStylesPath, "utf8");
  const universalRule = source.slice(
    source.indexOf("* {"),
    source.indexOf("[class*=\"overflow-auto\"]"),
  );
  const overflowRule = source.slice(
    source.indexOf("[class*=\"overflow-auto\"]"),
    source.indexOf("::-webkit-scrollbar"),
  );
  const webkitScrollbarRule = source.slice(
    source.indexOf("::-webkit-scrollbar {"),
    source.indexOf("::-webkit-scrollbar-button"),
  );

  assert.equal(
    source.includes("scrollbar-gutter: stable"),
    false,
  );
  assert.equal(overflowRule.includes("scrollbar-gutter: auto;"), true);
  assert.equal(
    source.includes("scrollbar-width: none;"),
    true,
  );
  assert.equal(
    webkitScrollbarRule.includes("height: 0;"),
    true,
  );
  assert.equal(
    webkitScrollbarRule.includes("width: 0;"),
    true,
  );
  assert.equal(
    source.includes("::-webkit-scrollbar-thumb:horizontal"),
    false,
  );
  assert.equal(source.includes("html.storage-is-scrolling"), false);
  assert.equal(universalRule.includes("scrollbar-width"), true);
  assert.equal(
    source.includes("@supports not selector(::-webkit-scrollbar)"),
    true,
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
