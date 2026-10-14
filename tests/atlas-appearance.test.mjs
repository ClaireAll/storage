import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

async function loadAppearancePanel() {
  const source = await readFile(
    new URL(
      "../src/app/(pages)/home/atlas/atlas-appearance.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const colorsSource = await readFile(
    new URL("../src/app/(pages)/home/atlas/atlas-colors.ts", import.meta.url),
    "utf8",
  );
  const colorsCompiled = ts.transpileModule(colorsSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const colorsModule = { exports: {} };
  Function("require", "module", "exports", colorsCompiled)(
    require, colorsModule, colorsModule.exports,
  );
  const localRequire = (id) => {
    if (id === "./atlas-colors") return colorsModule.exports;
    if (id === "@xyflow/react") {
      return {
        Background: () => null,
        BackgroundVariant: { Dots: "dots", Lines: "lines" },
        BaseEdge: () => null,
        getBezierPath: () => ["", 0, 0],
      };
    }
    if (id === "@/app/(pages)/common/overlay-scrollbar") {
      return {
        OverlayScrollArea: ({ children }) =>
          React.createElement("div", null, children),
      };
    }
    if (id === "./atlas-model") {
      return {
        appearancePreset: () => ({
          preset: "clear",
          background: "dots",
          backgroundColor: null,
          nodeStyle: "translucent",
          glowScope: "selected",
          glowColor: null,
          glowStrength: 20,
          edgeColor: null,
          edgeOpacity: 0.35,
          edgeWidth: 1,
          edgeGlow: false,
          labelMode: "all",
        }),
      };
    }
    return require(id);
  };

  Function("require", "module", "exports", compiled)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports.AtlasAppearancePanel;
}

test("default edge color does not trigger the disabled-alpha warning", async () => {
  const AtlasAppearancePanel = await loadAppearancePanel();
  const value = {
    preset: "clear",
    background: "dots",
    backgroundColor: null,
    nodeStyle: "translucent",
    glowScope: "selected",
    glowColor: null,
    glowStrength: 20,
    edgeColor: null,
    edgeOpacity: 0.35,
    edgeWidth: 1,
    edgeGlow: false,
    labelMode: "all",
  };
  const messages = [];
  const previousError = console.error;
  console.error = (...args) => messages.push(args.map(String).join(" "));

  try {
    renderToString(
      React.createElement(AtlasAppearancePanel, {
        value,
        disabled: false,
        onChange: () => {},
        onClose: () => {},
      }),
    );
  } finally {
    console.error = previousError;
  }

  assert.doesNotMatch(
    messages.join("\n"),
    /disabledAlpha.*alpha to be 100%/,
  );
});
