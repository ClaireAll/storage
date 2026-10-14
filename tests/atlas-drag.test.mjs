import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { adoptUserNodes } = createRequire(require.resolve("@xyflow/react"))("@xyflow/system");
const source = await readFile(new URL("../src/app/(pages)/home/atlas/atlas-workspace.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let buildNodes;
let handleChanges;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "nodes" && ts.isCallExpression(node.initializer)) {
    buildNodes = node.initializer.arguments[0].getText(ast);
  }
  if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onNodesChange") {
    handleChanges = node.initializer.expression.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
function evaluate(expression, scope) {
  const compiled = ts.transpileModule(`const callback = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(...Object.keys(scope), `${compiled}; return callback;`)(...Object.values(scope));
}

test("dragging and selecting retain measured dimensions and connection handles", () => {
  const scope = {
    graph: { nodes: [{ id: "a", title: "React", categoryId: "concept", position: { x: 0, y: 0 }, fixed: false }], categories: [{ id: "concept", color: "#23c99b" }] },
    topology: { degree: new Map([["a", 1]]), focus: new Set() },
    result: { visible: new Set(["a"]), matched: new Set(["a"]) },
    dragPositions: {}, nodeMeasurements: {}, selectedNodeIds: new Set(),
    readOnly: false, saving: false, token: { colorPrimary: "#1677ff" },
    resize: () => {}, appearance: { glowScope: "off" }, newNode: null, finishCreate: () => {},
  };
  const setters = Object.fromEntries([
    ["setDragPositions", "dragPositions"],
    ["setNodeMeasurements", "nodeMeasurements"],
    ["setSelectedNodeIds", "selectedNodeIds"],
  ].map(([setter, key]) => [setter, update => { scope[key] = update(scope[key]); }]));
  scope.displayedGraph = scope.graph;
  const changes = evaluate(handleChanges, { ...scope, ...setters });
  changes([{ type: "dimensions", id: "a", dimensions: { width: 48, height: 76 } }]);
  const lookup = new Map();
  const parents = new Map();
  adoptUserNodes(evaluate(buildNodes, scope)(), lookup, parents);
  const handles = { source: [], target: [] };
  lookup.get("a").internals.handleBounds = handles;
  changes([{ type: "select", id: "a", selected: true }, { type: "position", id: "a", position: { x: 20, y: 30 }, dragging: true }]);
  adoptUserNodes(evaluate(buildNodes, scope)(), lookup, parents);
  assert.deepEqual(lookup.get("a").measured, { width: 48, height: 76 });
  assert.equal(lookup.get("a").internals.handleBounds, handles);
  assert.deepEqual(lookup.get("a").position, { x: 20, y: 30 });
  const measurements = scope.nodeMeasurements;
  changes([{ type: "dimensions", id: "a", dimensions: { width: 48, height: 76 } }]);
  assert.equal(scope.nodeMeasurements, measurements);
});
