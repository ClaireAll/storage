import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/app/(pages)/home/atlas/atlas-model.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  createExampleGraph,
  validateGraph,
  imageReferences,
  searchGraph,
  duplicateEdge,
  appearancePreset,
  validateAppearance,
  canvasTextColor,
  moveAtlasNodes,
  updateAtlasCategory,
  addAtlasCategory,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("example is a valid graph; empty saved graphs stay valid", () => {
  validateGraph(createExampleGraph());
  validateGraph({
    version: 1,
    nodes: [],
    edges: [],
    categories: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
});

test("new categories require a name and duplicate commits are idempotent", () => {
  const graph = createExampleGraph();
  const draft = { id: "new-category", name: " ", color: "#abcd12" };
  assert.equal(addAtlasCategory(graph, draft), graph);
  const next = addAtlasCategory(graph, { ...draft, name: " 新分类 " });
  assert.equal(next.categories.at(-1).name, "新分类");
  assert.equal(graph.categories.length + 1, next.categories.length);
  assert.equal(addAtlasCategory(next, { ...draft, name: "新分类" }), next);
  assert.throws(() => addAtlasCategory(graph, { ...draft, name: graph.categories[0].name }));
});

test("inline category edits preserve order and reject invalid names", () => {
  const graph = createExampleGraph();
  const category = graph.categories[0];
  const next = updateAtlasCategory(graph, category.id, { name: " 技术概念 ", color: "#123456" });
  assert.equal(next.categories[0].name, "技术概念");
  assert.equal(next.categories[0].color, "#123456");
  assert.deepEqual(next.categories.map(item => item.id), graph.categories.map(item => item.id));
  assert.equal(graph.categories[0].name, "概念");
  assert.throws(() => updateAtlasCategory(graph, category.id, { name: " " }));
  assert.throws(() => updateAtlasCategory(graph, category.id, { name: graph.categories[1].name }));
  assert.throws(() => updateAtlasCategory(graph, category.id, { color: "#ff000080" }));
});

test("batch movement preserves fixed nodes and creates one immutable snapshot", () => {
  const graph = createExampleGraph();
  graph.nodes[1].fixed = true;
  const before = structuredClone(graph);
  const next = moveAtlasNodes(graph, graph.nodes.slice(0, 3).map(node => ({ id: node.id, position: { x: node.position.x + 50, y: node.position.y + 25 } })));
  assert.deepEqual(graph, before);
  assert.equal(next.nodes[0].position.x, before.nodes[0].position.x + 50);
  assert.equal(next.nodes[2].position.y, before.nodes[2].position.y + 25);
  assert.equal(next.nodes[1], graph.nodes[1]);
  assert.equal(next.nodes[3], graph.nodes[3]);
  assert.equal(moveAtlasNodes(next, next.nodes.map(node => ({ id: node.id, position: node.position }))), next);
});

test("appearance presets are independent and survive graph JSON round trips", () => {
  const clear = appearancePreset("clear");
  const cosmic = appearancePreset("cosmic");
  validateAppearance(clear);
  validateAppearance(cosmic);
  assert.equal(clear.backgroundColor, null);
  assert.equal(cosmic.glowScope, "all");
  clear.edgeWidth = 3;
  assert.equal(appearancePreset("clear").edgeWidth, 1);
  const graph = { ...createExampleGraph(), appearance: cosmic };
  const saved = JSON.parse(JSON.stringify(graph));
  validateGraph(saved);
  assert.deepEqual(saved.appearance, cosmic);
});

test("appearance rejects invalid colors, enums and out-of-range numbers", () => {
  for (const patch of [
    { backgroundColor: "url(https://untrusted.invalid)" },
    { glowScope: "unknown" },
    { glowStrength: Infinity },
    { edgeOpacity: 0 },
    { edgeWidth: 10 },
    { edgeGlow: "true" },
  ])
    assert.throws(() =>
      validateGraph({
        ...createExampleGraph(),
        appearance: { ...appearancePreset("clear"), ...patch },
      }),
    );
});

test("custom backgrounds get contrasting foreground colors", () => {
  assert.equal(canvasTextColor("#ffffff"), "#000000");
  assert.equal(canvasTextColor("#17191c"), "#ffffff");
  assert.equal(canvasTextColor("#ffeecc"), "#000000");
});

test("rejects invalid positions, missing categories, dangling edges and recursive documents", () => {
  const graph = createExampleGraph();
  graph.nodes[0].position.x = NaN;
  assert.throws(() => validateGraph(graph));
  graph.nodes[0].position.x = 0;
  graph.nodes[0].categoryId = "missing";
  assert.throws(() => validateGraph(graph));
  graph.nodes[0].categoryId = graph.categories[0].id;
  graph.edges[0].target = "missing";
  assert.throws(() => validateGraph(graph));
  graph.edges = [];
  graph.nodes[0].body = { type: "doc" };
  graph.nodes[0].body.content = [graph.nodes[0].body];
  assert.throws(() => validateGraph(graph));
});

test("search requires all words, ignores case, and includes only direct neighbours", () => {
  const graph = createExampleGraph();
  graph.nodes[0].title = "REACT";
  graph.nodes[0].tags = ["性能"];
  graph.nodes.slice(1).forEach((node) => {
    node.title = node.id;
    node.tags = [];
    node.body = { type: "doc" };
  });
  const { matched, visible } = searchGraph(graph, "react 性能");
  assert.deepEqual([...matched], [graph.nodes[0].id]);
  assert(visible.has(graph.nodes[1].id));
  assert(!visible.has(graph.nodes[2].id));
  assert.equal(searchGraph(graph, "react 不存在").matched.size, 0);
});

test("image references include rich text and deduplicate shared files", () => {
  const graph = createExampleGraph();
  const image = "https://example.com/atlas/user/photo.png";
  graph.nodes[0].image = image;
  graph.nodes[1].body = {
    type: "doc",
    content: [{ type: "image", attrs: { src: image } }],
  };
  assert.equal(imageReferences(graph).filter((url) => url === image).length, 1);
  graph.nodes = graph.nodes.filter((node) => node.id !== graph.nodes[0].id);
  assert(imageReferences(graph).includes(image));
});

test("undirected reverse edges duplicate; different direction or relation is allowed", () => {
  const edge = {
    id: "a",
    source: "1",
    target: "2",
    label: "相关",
    directed: false,
  };
  assert(duplicateEdge([edge], { ...edge, id: "b", source: "2", target: "1" }));
  assert(!duplicateEdge([edge], { ...edge, id: "b", directed: true }));
  assert(!duplicateEdge([edge], { ...edge, id: "b", label: "包含" }));
});
