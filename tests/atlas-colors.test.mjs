import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ColorPicker } from "antd";
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

test("random category colors use the chosen hue and remain opaque", () => {
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
  for (const file of ["atlas-workspace.tsx", "atlas-appearance.tsx"]) {
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
  assert.equal(count, 4);
});
