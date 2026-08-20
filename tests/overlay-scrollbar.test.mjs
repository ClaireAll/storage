import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL(
  "../src/app/(pages)/common/overlay-scrollbar.tsx",
  import.meta.url,
);
const stylesPath = new URL("../src/app/globals.css", import.meta.url);
const readmePreviewPath = new URL(
  "../src/app/(pages)/home/github-readme-preview-content.tsx",
  import.meta.url,
);

test("uses browser-native vertical scrollbars for every shared scroll viewport", async () => {
  const [component, styles] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(component, /export function OverlayScrollArea/);
  assert.match(component, /export function OverlayScrollbarHost/);
  assert.match(component, /new MutationObserver/);
  assert.doesNotMatch(component, /export function OverlayScrollbar\s*\(/);
  assert.doesNotMatch(component, /ScrollTimeline/);
  assert.doesNotMatch(component, /getAxisMetrics/);
  assert.doesNotMatch(component, /onPointerDown/);
  assert.match(component, /storage-overlay-scrollbar-viewport h-full min-h-0 min-w-0/);
  assert.match(styles, /scrollbar-width:\s*thin;/);
  assert.match(styles, /::\-webkit-scrollbar\s*\{[^}]*height:\s*10px;[^}]*width:\s*10px;/s);
  assert.match(styles, /::\-webkit-scrollbar-thumb\s*\{[^}]*background-color:/s);
  assert.match(
    styles,
    /--storage-scrollbar-thumb:\s*color-mix\([\s\S]*?var\(--storage-scrollbar-color,\s*var\(--home-theme-color, #22c55e\)\)/,
  );
});

test("keeps native scrollbar dimensions stable while marking scroll activity", async () => {
  const styles = await readFile(stylesPath, "utf8");

  assert.doesNotMatch(
    styles,
    /\.storage-is-vertically-scrolling::\-webkit-scrollbar\s*\{/,
  );
  assert.match(
    styles,
    /\.storage-is-vertically-scrolling\s*\{[^}]*scrollbar-color:/s,
  );
});

test("allows table-like views to bind native scrollbar styling to a separate viewport", async () => {
  const component = await readFile(componentPath, "utf8");

  assert.match(component, /horizontalTargetSelector\?: string;/);
  assert.match(component, /const \[horizontalScrollTarget, setHorizontalScrollTarget\]/);
  assert.match(component, /horizontalTargetSelector \?\? targetSelector/);
  assert.match(component, /target\.classList\.add\("storage-overlay-scrollbar-viewport"\)/);
});

test("routes README overflow through the shared horizontal scrollbar", async () => {
  const source = await readFile(readmePreviewPath, "utf8");

  assert.match(source, /<OverlayScrollArea[\s\S]*?horizontal/s);
  assert.doesNotMatch(source, /\[&_pre\]:overflow-x-auto/);
  assert.doesNotMatch(source, /\[&_table\]:overflow-x-auto/);
});
