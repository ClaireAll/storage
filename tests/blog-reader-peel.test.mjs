import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readerPath = new URL(
  "../src/app/(pages)/home/blog/blog-reader.tsx",
  import.meta.url,
);
const dashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);
const homeStylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);

test("uses an accessible circular icon control to toggle the note list", async () => {
  const source = await readFile(readerPath, "utf8");

  assert.match(
    source,
    /const \[isListCollapsed, setIsListCollapsed\] = useState\(false\);/,
  );
  assert.match(source, /aria-controls="blog-reader-list-panel"/);
  assert.match(source, /aria-expanded=\{!isListCollapsed\}/);
  assert.match(
    source,
    /className="blog-reader-list-toggle[^\"]*absolute![^\"]*rounded-full/,
  );
  assert.match(
    source,
    /icon=\{isListCollapsed \? <MenuUnfoldOutlined \/> : <MenuFoldOutlined \/>\}/,
  );
});

test("hides the note list while keeping the reader at full width", async () => {
  const source = await readFile(readerPath, "utf8");

  assert.match(source, /id="blog-reader-list-panel"/);
  assert.match(source, /hidden=\{isListCollapsed\}/);
  assert.match(source, /\{!isListCollapsed \? readerList : null\}/);
  assert.match(
    source,
    /<div className="relative h-full min-h-0 w-full">[\s\S]*<div[\s\S]*isListCollapsed\s*\?\s*"grid-cols-1"/,
  );
  assert.doesNotMatch(source, /<Peel|supportsHtmlInCanvas|useSyncExternalStore/);
});

test("keeps the toggle outside the reader grid auto-placement", async () => {
  const source = await readFile(readerPath, "utf8");

  assert.match(
    source,
    /<div hidden=\{isListCollapsed\} id="blog-reader-list-panel">[\s\S]*\{preview\}[\s\S]*<\/div>[\s\S]*<Button[\s\S]*className="blog-reader-list-toggle/,
  );
});

test("keeps the reader toggle visible in the card gutter", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(
    source,
    /has-\[\.blog-reader-list-toggle\]:overflow-visible/,
  );
});

test("uses shared preview tokens for note preview borders and dividers", async () => {
  const styles = await readFile(homeStylesPath, "utf8");

  assert.match(
    styles,
    /\.blog-reader-preview\s*\{[\s\S]*border:\s*1px solid var\(--home-preview-border-color\);/,
  );
  assert.match(
    styles,
    /\.blog-reader-preview-header\s*\{[\s\S]*border-bottom:\s*1px solid var\(--home-preview-divider-color\);/,
  );
  assert.match(
    styles,
    /\.blog-reader-list-item\s*\{[\s\S]*var\(--home-preview-divider-color\)/,
  );
});
