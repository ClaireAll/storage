import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-workspace.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const attributes = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "deleteElements")
    attributes.set("deleteElements", node.initializer.getText(ast));
  if (ts.isJsxAttribute(node) && ["deleteKeyCode", "onBeforeDelete", "onDelete"].includes(node.name.getText(ast))) {
    attributes.set(node.name.getText(ast), node.initializer.expression.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
function evaluate(name, scope) {
  assert.ok(attributes.has(name), `missing ${name}`);
  const compiled = ts.transpileModule(`const callback = ${attributes.get(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return Function(...Object.keys(scope), `${compiled}; return callback;`)(...Object.values(scope));
}

test("native deletion keys are enabled only when editing", () => {
  assert.deepEqual(evaluate("deleteKeyCode", { readOnly: false, saving: false }), ["Delete", "Backspace"]);
  assert.equal(evaluate("deleteKeyCode", { readOnly: true, saving: false }), null);
  assert.equal(evaluate("deleteKeyCode", { readOnly: false, saving: true }), null);
});

test("direct deletion removes selected nodes and connected edges in one snapshot", async () => {
  let next;
  let snapshots = 0;
  const scope = {
    readOnly: false, savingRef: { current: false }, newNodeRef: { current: null },
    graphRef: { current: { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [{ id: "ab", source: "a", target: "b" }, { id: "bc", source: "b", target: "c" }] } },
    change: graph => { next = graph; snapshots++; },
    setSelection: () => {}, setSelectedNodeIds: () => {}, setSelectedEdgeIds: () => {},
  };
  const before = evaluate("onBeforeDelete", scope);
  const deletion = { nodes: [{ id: "a" }], edges: [{ id: "ab" }] };
  assert.equal(await before(deletion), true);
  const deleteElements = evaluate("deleteElements", scope);
  evaluate("onDelete", { ...scope, deleteElements })(deletion);
  assert.deepEqual(next.nodes.map(node => node.id), ["b", "c"]);
  assert.deepEqual(next.edges.map(edge => edge.id), ["bc"]);
  assert.equal(snapshots, 1);
  scope.savingRef.current = true;
  assert.equal(await before(deletion), false);
});
