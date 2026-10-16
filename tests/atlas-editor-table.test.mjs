import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const tiptapRequire = createRequire(require.resolve("@tiptap/react"));
const { Editor } = tiptapRequire("@tiptap/core");
const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-editor-extensions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
Function("require", "module", "exports", compiled)(require, loaded, loaded.exports);
const { atlasEditorExtensions } = loaded.exports;
const createEditor = (content = { type: "doc", content: [{ type: "paragraph" }] }, editable = true) =>
  new Editor({ element: null, extensions: atlasEditorExtensions, content, editable });

test("table insertion includes a header and supports row and column commands", () => {
  const editor = createEditor();
  try {
    assert.equal(editor.commands.insertTable({ rows: 3, cols: 2, withHeaderRow: true }), true);
    assert.equal(editor.getJSON().content[0].content[0].content[0].type, "tableHeader");
    assert.equal(editor.commands.addRowAfter(), true);
    assert.equal(editor.getJSON().content[0].content.length, 4);
    assert.equal(editor.commands.addColumnAfter(), true);
    assert.equal(editor.getJSON().content[0].content[0].content.length, 3);
    assert.equal(editor.commands.deleteColumn(), true);
    assert.equal(editor.commands.deleteRow(), true);
    assert.equal(editor.commands.deleteTable(), true);
    assert.ok(editor.getJSON().content.every(node => node.type !== "table"));
  } finally { editor.destroy(); }
});

test("read-only table documents survive JSON round trips without losing event names", () => {
  const editor = createEditor();
  let reader;
  try {
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    const value = editor.getJSON();
    value.content[0].content[1].content[0].content[0] = {
      type: "paragraph", content: [{ type: "text", text: "SCROLL_ENG_WITH_THRESHOLD", marks: [{ type: "code" }] }],
    };
    reader = createEditor(JSON.parse(JSON.stringify(value)), false);
    assert.equal(reader.isEditable, false);
    assert.deepEqual(reader.getJSON(), value);
  } finally { editor.destroy(); reader?.destroy(); }
});

test("lists and old rich-text notes are preserved after enabling tables", () => {
  const value = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "TOUCH_START：开始触摸。" }] }] }] }] };
  const editor = createEditor(value);
  try { assert.deepEqual(editor.getJSON(), value); } finally { editor.destroy(); }
});

test("custom colors work on event names and survive read-only JSON loading", () => {
  const value = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "TOUCH_START", marks: [{ type: "code" }] }] }] };
  const editor = createEditor(value);
  let reader;
  try {
    editor.commands.setTextSelection({ from: 1, to: 12 });
    editor.commands.setColor("#faad14");
    const colored = editor.getJSON().content[0].content[0];
    assert.ok(colored.marks.some(mark => mark.type === "code"));
    assert.ok(colored.marks.some(mark => mark.type === "textStyle" && mark.attrs.color === "#faad14"));
    reader = createEditor(JSON.parse(JSON.stringify(editor.getJSON())), false);
    assert.deepEqual(reader.getJSON(), editor.getJSON());
    editor.commands.unsetColor();
    const cleared = editor.getJSON().content[0].content[0];
    assert.ok(cleared.marks.some(mark => mark.type === "code"));
    assert.ok(!cleared.marks.some(mark => mark.type === "textStyle" && mark.attrs.color));
  } finally { editor.destroy(); reader?.destroy(); }
});
