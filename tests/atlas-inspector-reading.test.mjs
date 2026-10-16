import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";

const folder = new URL("../src/app/(pages)/home/atlas/", import.meta.url);
const require = createRequire(import.meta.url);

async function loadComponent(file, stubs) {
  const source = await readFile(new URL(file, folder), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  Function("require", "module", "exports", compiled)(
    id => id in stubs ? stubs[id] : require(id), loaded, loaded.exports,
  );
  return loaded.exports;
}

test("selection starts in reading mode and editing never saves remotely", async () => {
  let editing = false;
  const controls = [];
  const element = (tag, extra = () => ({})) => function TestElement(props) { return React.createElement(tag, { ...extra(props) }, props.children); };
  const Button = props => { controls.push(props); return React.createElement("button", { "aria-label": props["aria-label"], disabled: props.disabled }, props.children); };
  const Input = element("input");
  Input.TextArea = element("textarea");
  const { AtlasInspector } = await loadComponent("atlas-inspector.tsx", {
    react: { ...React, useState: () => [editing, update => { editing = update(editing); }] },
    antd: { Button, Input, Select: element("select"), Switch: element("button"), Tag: element("span"), Divider: () => null, Image: () => null, Tooltip: ({ children }) => children },
    "./atlas-editor": { AtlasEditor: props => React.createElement("div", { "data-reading": String(props.readOnly) }) },
    "@/app/(pages)/common/overlay-scrollbar": { OverlayScrollArea: element("div") },
  });
  const node = { id: "a", title: "输入事件", categoryId: "concept", tags: [], body: { type: "doc" } };
  let graphChanges = 0;
  const props = {
    graph: { nodes: [node], edges: [], categories: [{ id: "concept", name: "概念" }] },
    selection: { type: "node", id: "a" }, selectedNode: node,
    readOnly: false, saving: false, expanded: false,
    patchNode: () => { graphChanges++; }, change: () => { graphChanges++; },
  };
  const reading = renderToStaticMarkup(React.createElement(AtlasInspector, props));
  assert.match(reading, /data-reading="true"/);
  assert.doesNotMatch(reading, /<input/);
  controls.find(button => button["aria-label"] === "编辑知识").onClick();
  assert.equal(editing, true);
  assert.match(renderToStaticMarkup(React.createElement(AtlasInspector, props)), /data-reading="false"/);
  assert.match(renderToStaticMarkup(React.createElement(AtlasInspector, { ...props, saving: true })), /data-reading="true"/);
  assert.equal(graphChanges, 0);
});

test("expansion changes panel sizes without replacing the canvas; only resize-end stores width", async () => {
  let sizes;
  let splitter;
  let stored;
  const { AtlasInspectorLayout } = await loadComponent("atlas-inspector-layout.tsx", {
    react: { ...React, useEffect: () => {}, useState: () => [360, value => { sizes = value; }] },
    antd: { Splitter: Object.assign(props => { splitter = props; return props.children; }, {
      Panel: props => React.createElement("div", { "data-size": String(props.size) }, props.children),
    }) },
  });
  const base = { visible: true, expanded: false, children: React.createElement("canvas"), details: "详情" };
  assert.match(renderToStaticMarkup(React.createElement(AtlasInspectorLayout, base)), /data-size="360"/);
  const previous = globalThis.localStorage;
  globalThis.localStorage = { setItem: (key, value) => { stored = { key, value }; } };
  try {
    splitter.onResize([500, 480]);
    assert.equal(sizes, 480);
    assert.equal(stored, undefined);
    splitter.onResizeEnd([500, 480]);
    assert.deepEqual(stored, { key: "atlas-inspector-width", value: "480" });
    const expanded = renderToStaticMarkup(React.createElement(AtlasInspectorLayout, { ...base, expanded: true }));
    assert.match(expanded, /data-size="0"><canvas/);
    assert.match(expanded, /data-size="100%"/);
    const hidden = renderToStaticMarkup(React.createElement(AtlasInspectorLayout, { ...base, visible: false }));
    assert.match(hidden, /<canvas/);
    assert.match(hidden, /data-size="0">详情/);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test("inspector width accepts only bounded finite numbers", async () => {
  const source = await readFile(new URL("atlas-inspector-layout.tsx", folder), "utf8");
  const ast = ts.createSourceFile("layout.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "inspectorWidth");
  assert.ok(fn);
  const compiled = ts.transpileModule(fn.getText(ast).replace("export ", ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const width = Function(compiled + ";return inspectorWidth;")();
  assert.equal(width(null), 360);
  assert.equal(width("invalid"), 360);
  assert.equal(width("Infinity"), 360);
  assert.equal(width("0"), 280);
  assert.equal(width("600"), 600);
  assert.equal(width("10000"), 720);
});

test("reading uses existing scroll owner and does not remount the canvas on expand", async () => {
  const layout = await readFile(new URL("atlas-inspector-layout.tsx", folder), "utf8");
  const inspector = await readFile(new URL("atlas-inspector.tsx", folder), "utf8");
  const workspace = await readFile(new URL("atlas-workspace.tsx", folder), "utf8");
  assert.match(layout, /<Splitter/);
  assert.match(layout, /onResizeEnd/);
  assert.match(layout, /localStorage\.setItem/);
  assert.doesNotMatch(layout, /expanded\s*\?\s*null|onScroll|scrollTop|getBoundingClientRect/);
  assert.match(workspace, /<AtlasInspectorLayout/);
  assert.match(inspector, /useState\(false\)/);
  assert.match(inspector, /readOnly=\{saving \|\| !editing\}/);
  assert.match(inspector, /展开阅读/);
  assert.match(inspector, /编辑知识/);
  assert.match(inspector, /<OverlayScrollArea/);
});
