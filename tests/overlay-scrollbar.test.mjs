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

test("provides a shared overlay scrollbar without scroll hot-path layout reads", async () => {
  const [component, styles] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(component, /export function OverlayScrollArea/);
  assert.match(component, /export function OverlayScrollbar/);
  assert.match(component, /export function OverlayScrollbarHost/);
  assert.match(component, /new ResizeObserver/);
  assert.match(component, /new MutationObserver/);
  assert.match(component, /onPointerDown/);
  assert.match(component, /setPointerCapture/);
  assert.match(component, /scrollTo\(/);
  assert.doesNotMatch(component, /addEventListener\("scroll"/);
  assert.doesNotMatch(component, /onScroll=/);
  assert.match(component, /storage-overlay-scrollbar-host/);
  assert.match(component, /storage-overlay-scrollbar-vertical-thumb/);
  assert.match(component, /storage-overlay-scrollbar-horizontal-thumb/);
  assert.match(component, /ScrollTimeline/);
  assert.match(styles, /storage-overlay-scrollbar-active/);
  assert.match(component, /onKeyDown/);
});

test("keeps overlay scrollbars outside the document layout flow", async () => {
  const [component, styles] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.match(component, /storage-overlay-scrollbar-container relative min-h-0 min-w-0/);
  assert.match(component, /pointer-events-none absolute inset-0 z-10/);
  assert.match(component, /storage-overlay-scrollbar-horizontal/);
  assert.match(
    styles,
    /\.storage-overlay-scrollbar-rail\s*\{[\s\S]*?position:\s*absolute;/,
  );
  assert.match(
    styles,
    /\.storage-overlay-scrollbar-container\.storage-overlay-scrollbar-active/,
  );
});

test("resets the README preview scrollbar when its repository changes", async () => {
  const source = await readFile(readmePreviewPath, "utf8");

  assert.match(
    source,
    /<OverlayScrollArea\s+className="min-h-0 flex-1"\s+horizontal\s+key=\{repository\}/,
  );
});

test("allows table-like views to bind horizontal overflow to a separate viewport", async () => {
  const component = await readFile(componentPath, "utf8");

  assert.match(component, /horizontalTargetSelector\?: string;/);
  assert.match(component, /const \[horizontalScrollTarget, setHorizontalScrollTarget\]/);
  assert.match(component, /horizontalTargetSelector \?\? targetSelector/);
  assert.match(
    component,
    /<OverlayScrollbar\s+horizontal\s+scrollTarget=\{horizontalScrollTarget\}\s+vertical=\{false\}/,
  );
});

test("routes README overflow through the shared horizontal scrollbar", async () => {
  const source = await readFile(readmePreviewPath, "utf8");

  assert.match(source, /<OverlayScrollArea[\s\S]*?horizontal/s);
  assert.doesNotMatch(source, /\[&_pre\]:overflow-x-auto/);
  assert.doesNotMatch(source, /\[&_table\]:overflow-x-auto/);
});
