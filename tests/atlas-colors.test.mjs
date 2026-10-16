import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { Children, createElement, isValidElement } from "react";
import { renderToString } from "react-dom/server";
import { Button, ColorPicker, Tooltip } from "antd";
import { RetweetOutlined } from "@ant-design/icons";
import { FastColor } from "@ant-design/fast-color";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-colors.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"@ant-design/fast-color"', JSON.stringify(pathToFileURL(require.resolve("@ant-design/fast-color")).href));
const { opaqueAtlasColor, randomAtlasColor } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("normalizes empty and alpha colors while preserving RGB channels", () => {
  for (const value of [undefined, null, ""]) assert.equal(opaqueAtlasColor(value), "#1677ff");
  assert.equal(opaqueAtlasColor("rgba(0, 0, 0, 0.45)"), "#000000");
  assert.equal(opaqueAtlasColor("#ff330080"), "#ff3300");
  assert.equal(opaqueAtlasColor("hsla(120, 100%, 50%, 0.5)"), "#00ff00");
  assert.equal(opaqueAtlasColor("#1677ff"), "#1677ff");
});

test("random category colors return opaque six-digit HEX values", () => {
  const original = Math.random;
  try {
    Math.random = () => 0;
    const first = randomAtlasColor();
    Math.random = () => 0.5;
    const second = randomAtlasColor();
    assert.match(first, /^#[0-9a-f]{6}$/i);
    assert.match(second, /^#[0-9a-f]{6}$/i);
    assert.notEqual(first, second);
  } finally { Math.random = original; }
});

test("random category colors include black, white, gray, dark and fully saturated RGB values", () => {
  const original = Math.random;
  const cases = [
    { draws: [0, 0, 0], expected: "#000000" },
    { draws: [0.99999, 0.99999, 0.99999], expected: "#ffffff" },
    { draws: [0.5, 0.5, 0.5], expected: "#808080" },
    { draws: [0.01, 0.02, 0.03], expected: "#020507" },
    { draws: [0.99999, 0, 0], expected: "#ff0000" },
    { draws: [0, 0.99999, 0.99999], expected: "#00ffff" },
  ];
  try {
    for (const { draws, expected } of cases) {
      Math.random = () => draws.shift() ?? 0;
      const hex = randomAtlasColor();
      const color = new FastColor(hex);
      assert.equal(hex, expected);
      assert.equal(color.toRgb().a, 1);
    }
  } finally { Math.random = original; }
});

test("actual disabled-alpha ColorPicker renders without usage warnings", () => {
  const original = console.error;
  const warnings = [];
  console.error = (...args) => warnings.push(args.join(" "));
  try {
    for (const value of [undefined, null, "", "rgba(0, 0, 0, 0.45)", "#ff330080", "#1677ff"]) renderToString(createElement(ColorPicker, { value: opaqueAtlasColor(value), disabledAlpha: true }));
  } finally { console.error = original; }
  assert.deepEqual(warnings, []);
});

test("Atlas disabled-alpha pickers must use the opaque color boundary", async () => {
  let count = 0;
  for (const file of ["atlas-workspace.tsx", "atlas-appearance.tsx", "atlas-editor.tsx"]) {
    const source = await readFile(new URL(`../src/app/(pages)/home/atlas/${file}`, import.meta.url), "utf8");
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === "ColorPicker") {
        const props = node.attributes.properties.filter(ts.isJsxAttribute);
        if (props.some(prop => prop.name.text === "disabledAlpha")) {
          const value = props.find(prop => prop.name.text === "value")?.initializer;
          const expression = value && ts.isJsxExpression(value) ? value.expression : null;
          assert(expression && ts.isCallExpression(expression) && expression.expression.getText(tree) === "opaqueAtlasColor", `${file}: disabledAlpha requires opaqueAtlasColor(value)`);
          count++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  assert.equal(count, 5);
});

test("category picker random action updates the current graph once and respects saving guards", async () => {
  const workspace = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-workspace.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("atlas-workspace.tsx", workspace, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let panelRender;
  const visit = node => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === "ColorPicker") {
      const props = node.attributes.properties.filter(ts.isJsxAttribute);
      if (props.find(prop => prop.name.text === "value")?.getText(tree).includes("category.color")) {
        panelRender = props.find(prop => prop.name.text === "panelRender")?.initializer?.expression;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(panelRender, "the category color panel needs a random action");

  const modelSource = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-model.ts", import.meta.url), "utf8");
  const modelOutput = ts.transpileModule(modelSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { createExampleGraph, updateAtlasCategory } = await import(`data:text/javascript;base64,${Buffer.from(modelOutput).toString("base64")}`);
  const original = createExampleGraph();
  const graphRef = { current: original };
  const savingRef = { current: false };
  const changes = [];
  const panelOutput = ts.transpileModule(`module.exports = ${panelRender.getText(tree)}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const renderPanel = (saving = false) => {
    const mod = { exports: {} };
    Function("require", "module", "exports", "Button", "Tooltip", "RetweetOutlined", "category", "graphRef", "savingRef", "saving", "change", "randomAtlasColor", "updateAtlasCategory", panelOutput)(
      require, mod, mod.exports, Button, Tooltip, RetweetOutlined, original.categories[0], graphRef, savingRef, saving,
      next => { changes.push(next); graphRef.current = next; }, randomAtlasColor, updateAtlasCategory,
    );
    return mod.exports(createElement("div", { "aria-label": "原始调色面板" }));
  };
  const findButton = node => {
    if (!isValidElement(node)) return undefined;
    return node.type === Button ? node : Children.toArray(node.props.children).map(findButton).find(Boolean);
  };
  const panel = renderPanel();
  assert.match(renderToString(panel), /aria-label="原始调色面板"/);
  const button = findButton(panel);
  assert.ok(button);
  assert.match(button.props["aria-label"], /随机/);
  assert.equal(button.props.children, undefined, "the hue-row action must be a compact icon, not a footer text button");
  const classes = [];
  const collectClasses = node => {
    if (!isValidElement(node)) return;
    if (node.props.className) classes.push(...node.props.className.split(/\s+/));
    Children.forEach(node.props.children, collectClasses);
  };
  collectClasses(panel);
  const { compile } = require("tailwindcss");
  const themeCss = await readFile(require.resolve("tailwindcss/theme.css"), "utf8");
  const css = (await compile(`${themeCss}\n@tailwind utilities;`)).build(classes);
  assert.match(css, /width:\s*234px/, "the custom grid must retain Ant Design's native 234px panel width");
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/);
  for (const nativeClass of ["inner-content", "panel", "slider-container"]) {
    assert.match(css, new RegExp(`\\.ant-color-picker-${nativeClass}\\s*\\{\\s*display:\\s*contents`));
  }
  for (const nativeClass of ["slider-group", "color-block"]) {
    assert.match(css, new RegExp(`\\.ant-color-picker-${nativeClass}\\s*\\{\\s*grid-row-start:\\s*2`));
  }
  assert.match(css, /\.ant-color-picker-input-container\s*\{\s*grid-row-start:\s*3/);
  const previousRandom = Math.random;
  try {
    Math.random = () => 0;
    button.props.onClick();
    assert.equal(changes.length, 1);
    assert.equal(graphRef.current.categories[0].color, "#000000");
    assert.equal(original.categories[0].color, "#23c99b");
    assert.equal(graphRef.current.categories[1], original.categories[1]);
    assert.equal(graphRef.current.nodes, original.nodes);
    Math.random = () => 0.5;
    button.props.onClick();
    assert.equal(changes.length, 2);
    assert.equal(graphRef.current.categories[0].color, "#808080");
    assert.equal(changes[0].categories[0].color, "#000000");
    savingRef.current = true;
    button.props.onClick();
    assert.equal(changes.length, 2);
    assert.equal(findButton(renderPanel(true)).props.disabled, true);
    savingRef.current = false;
    graphRef.current = null;
    button.props.onClick();
    assert.equal(changes.length, 2);
  } finally { Math.random = previousRandom; }
});
