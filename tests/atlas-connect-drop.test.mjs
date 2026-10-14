import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-workspace.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const expressions = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ["beginCreate", "connect"].includes(node.name.getText(ast))) expressions.set(node.name.getText(ast), node.initializer.getText(ast));
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "finishCreate") expressions.set("finishCreate", node.initializer.arguments[0].getText(ast));
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onConnectEnd") expressions.set("onConnectEnd", node.initializer.expression.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
function evaluate(name, scope) {
  const compiled = ts.transpileModule(`const callback = ${expressions.get(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return Function(...Object.keys(scope), `${compiled}; return callback;`)(...Object.values(scope));
}
class Target {
  constructor(pane) { this.classList = { contains: () => pane }; }
}

test("only an unfinished connection dropped on the pane opens creation at flow coordinates", () => {
  let draft;
  let title;
  const scope = {
    readOnly: false, savingRef: { current: false }, Element: Target,
    flowRef: { current: { screenToFlowPosition: point => ({ x: point.x / 2, y: point.y / 2 }) } },
    beginCreate: (position, connection) => { draft = { ...connection, position }; title = ""; },
  };
  const end = evaluate("onConnectEnd", scope);
  const connection = { isValid: false, toNode: null, fromNode: { id: "parent" }, fromHandle: { type: "source" } };
  const event = { target: new Target(true), clientX: 200, clientY: 100 };
  end(event, connection);
  assert.deepEqual(draft, { nodeId: "parent", handleType: "source", position: { x: 100, y: 50 } });
  assert.equal(title, "");
  for (const [target, state] of [
    [new Target(false), connection], [event.target, { ...connection, isValid: true }],
    [event.target, { ...connection, toNode: { id: "existing" } }],
  ]) {
    draft = null;
    end({ ...event, target }, state);
    assert.equal(draft, null);
  }
  scope.savingRef.current = true;
  end(event, connection);
  assert.equal(draft, null);
  scope.savingRef.current = false;
  evaluate("onConnectEnd", { ...scope, readOnly: true })(event, connection);
  assert.equal(draft, null);
});

test("inline naming creates node and edge in one snapshot; blank names cancel the preview", () => {
  for (const handleType of ["source", "target"]) {
    const graph = { nodes: [{ id: "parent", title: "Parent", categoryId: "note" }], edges: [], categories: [{ id: "concept" }, { id: "note" }] };
    let next;
    let snapshots = 0;
    const scope = {
      graphRef: { current: graph }, readOnly: false, savingRef: { current: false },
      newNodeRef: { current: null }, message: { info: () => {} },
      flowRef: { current: null }, emptyDocument: { type: "doc" },
      change: value => { next = value; snapshots++; },
      setNewNode: () => {}, setSelection: () => {}, setSelectedNodeIds: () => {}, setSelectedEdgeIds: () => {},
    };
    const begin = evaluate("beginCreate", scope);
    begin({ x: 100, y: 50 }, { nodeId: "parent", handleType });
    assert.ok(scope.newNodeRef.current);
    assert.equal(snapshots, 0);
    evaluate("finishCreate", scope)(" ");
    assert.equal(scope.newNodeRef.current, null);
    assert.equal(snapshots, 0);
    begin({ x: 100, y: 50 }, { nodeId: "parent", handleType });
    const finish = evaluate("finishCreate", scope);
    finish(" Child ");
    finish(" Child ");
    assert.equal(snapshots, 1);
    const node = next.nodes.at(-1);
    assert.equal(node.title, "Child");
    assert.equal(node.categoryId, "note");
    assert.deepEqual(node.position, { x: 100, y: 50 });
    assert.equal(next.edges[0].source, handleType === "source" ? "parent" : node.id);
    assert.equal(next.edges[0].target, handleType === "source" ? node.id : "parent");
    assert.equal(graph.nodes.length, 1);
  }
});

test("connecting existing nodes creates the edge directly without a dialog", () => {
  let next;
  const graph = { edges: [] };
  const scope = {
    readOnly: false, saving: false, savingRef: { current: false },
    graphRef: { current: graph }, duplicateEdge: () => false,
    change: value => { next = value; },
  };
  evaluate("connect", scope)({ source: "a", target: "b" });
  assert.equal(next.edges.length, 1);
  assert.equal(next.edges[0].source, "a");
  assert.equal(next.edges[0].target, "b");
});
