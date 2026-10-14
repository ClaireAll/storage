import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-workspace.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let expression;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "patchEdge")
    expression = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
test("inline edge edits preserve order, trim names, reject duplicates and create one undo snapshot", () => {
  const edge = { id: "ab", source: "a", target: "b", label: "", directed: false };
  const scope = {
    graphRef: { current: { edges: [edge, { ...edge, id: "other", label: "taken" }] } },
    readOnly: false, savingRef: { current: false },
    duplicateEdge: (edges, candidate) => edges.some(item => item.id !== candidate.id && item.label === candidate.label && item.directed === candidate.directed),
    message: { warning: () => {} },
  };
  let changes = 0;
  scope.change = value => { scope.graphRef.current = value; changes++; };
  const compiled = ts.transpileModule(`const callback = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const patch = Function(...Object.keys(scope), `${compiled}; return callback;`)(...Object.values(scope));
  assert.equal(patch("ab", { label: " first " }), true);
  assert.equal(scope.graphRef.current.edges[0].label, "first");
  assert.equal(changes, 1);
  assert.equal(patch("ab", { label: "first" }), true);
  assert.equal(changes, 1);
  assert.equal(patch("ab", { label: "taken" }), false);
  assert.equal(scope.graphRef.current.edges[0].label, "first");
  assert.equal(patch("ab", { directed: true }), true);
  assert.equal(changes, 2);
  assert.deepEqual(scope.graphRef.current.edges.map(item => item.id), ["ab", "other"]);
  scope.savingRef.current = true;
  assert.equal(patch("ab", { label: "blocked" }), false);
  assert.equal(changes, 2);
});

test("relationship fields are in the inspector, not an edit modal", async () => {
  const inspector = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-inspector.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /edgeDraft|setEdgeDraft|title="编辑关系"/);
  assert.doesNotMatch(inspector, /编辑关系|setEdgeDraft/);
  assert.match(inspector, /aria-label="关系名称"/);
  assert.match(inspector, /aria-label="有向关系"/);
});
