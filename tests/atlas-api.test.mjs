import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const url = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const modelUrl = url(
  compile(
    await readFile(
      new URL("../src/app/(pages)/home/atlas/atlas-model.ts", import.meta.url),
      "utf8",
    ),
  ),
);
const { createExampleGraph, appearancePreset } = await import(modelUrl);
const stubs = {
  "next/server": url(
    "export const NextResponse = { json: (data, options) => Response.json(data, options) };",
  ),
  "../../../../auth": url(
    "export const auth = async () => globalThis.atlasTest.session;",
  ),
  "@/utils/supabase/admin": url(
    "export const createAdminClient = () => globalThis.atlasTest.db;",
  ),
  "@/utils/oss-server": url(
    "export const deleteOwnOssObject = (...args) => globalThis.atlasTest.delete(...args);",
  ),
  "@/app/(pages)/home/atlas/atlas-model": modelUrl,
};
const source = await readFile(
  new URL("../src/app/api/atlas/route.ts", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  transformers: {
    before: [
      (context) => (root) => {
        const visit = (node) => {
          if (ts.isImportDeclaration(node) && stubs[node.moduleSpecifier.text])
            return ts.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              ts.factory.createStringLiteral(stubs[node.moduleSpecifier.text]),
              node.attributes,
            );
          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(root, visit);
      },
    ],
  },
}).outputText;
const { GET, PUT } = await import(url(output));
process.env.ALIYUN_OSS_PUBLIC_BASE_URL = "https://atlas-test.invalid";

/** 使用内存数据库替身验证写入顺序及用户过滤，不访问真实云端。 */
function setup(graph = createExampleGraph()) {
  const state = {
    session: { user: { id: "owner" } },
    row: { graph, pending_delete_keys: [], created_at: null },
    calls: [],
    failSave: false,
    failDelete: false,
    async delete(url, user, directories) {
      state.calls.push(["delete", url, user, directories]);
      if (state.failDelete) throw new Error("OSS unavailable");
    },
  };
  state.db = {
    from(table) {
      assert.equal(table, "atlas_graphs");
      let patch = null;
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          if (column === "user_id") assert.equal(value, "owner");
          return query;
        },
        async maybeSingle() {
          return { data: structuredClone(state.row), error: null };
        },
        async single() {
          return { data: structuredClone(state.row), error: null };
        },
        async upsert(value) {
          state.calls.push(["save", value]);
          if (state.failSave) return { error: new Error("DB unavailable") };
          state.row = structuredClone(value);
          return { error: null };
        },
        update(value) {
          patch = value;
          return query;
        },
        then(resolve) {
          Object.assign(state.row, patch);
          state.calls.push(["cleanup-record", patch]);
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return query;
    },
  };
  globalThis.atlasTest = state;
  return state;
}
const request = (graph) =>
  new Request("https://storage.invalid/api/atlas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graph }),
  });

test("unauthenticated reads and writes are rejected", async () => {
  setup().session = null;
  assert.equal((await GET()).status, 401);
  assert.equal((await PUT(request(createExampleGraph()))).status, 401);
});

test("appearance is saved and restored with the graph; invalid appearance is rejected", async () => {
  const state = setup();
  const graph = {
    ...createExampleGraph(),
    appearance: appearancePreset("cosmic"),
  };
  assert.equal((await PUT(request(graph))).status, 200);
  assert.deepEqual(state.row.graph.appearance, graph.appearance);
  const restored = await (await GET()).json();
  assert.deepEqual(restored.graph.appearance, graph.appearance);
  graph.appearance.edgeWidth = -1;
  assert.equal((await PUT(request(graph))).status, 400);
});

test("rejects images outside the current user directory", async () => {
  const state = setup();
  const graph = createExampleGraph();
  graph.nodes[0].image = "https://atlas-test.invalid/atlas/other/photo.png";
  assert.equal((await PUT(request(graph))).status, 400);
  assert.equal(state.calls.length, 0);
});

test("failed database save never deletes original images", async () => {
  const old = createExampleGraph();
  old.nodes[0].image = "https://atlas-test.invalid/atlas/owner/photo.png";
  const state = setup(old);
  state.failSave = true;
  const next = createExampleGraph();
  assert.equal((await PUT(request(next))).status, 500);
  assert(!state.calls.some((call) => call[0] === "delete"));
});

test("save precedes OSS deletion; deletion failures persist for retry", async () => {
  const old = createExampleGraph();
  old.nodes[0].image = "https://atlas-test.invalid/atlas/owner/photo.png";
  const state = setup(old);
  state.failDelete = true;
  const response = await PUT(request(createExampleGraph()));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cleanupPending, 1);
  assert.equal(state.calls[0][0], "save");
  assert.deepEqual(state.row.pending_delete_keys, ["atlas/owner/photo.png"]);
  state.failDelete = false;
  const retry = await PUT(request(createExampleGraph()));
  assert.equal((await retry.json()).deletedImages, 1);
  assert.deepEqual(state.row.pending_delete_keys, []);
});

test("restored rich-text references cancel pending cleanup", async () => {
  const state = setup();
  state.row.pending_delete_keys = ["atlas/owner/photo.png"];
  const next = createExampleGraph();
  next.nodes[0].body = {
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: "https://atlas-test.invalid/atlas/owner/photo.png" },
      },
    ],
  };
  assert.equal((await PUT(request(next))).status, 200);
  assert(!state.calls.some((call) => call[0] === "delete"));
  assert.deepEqual(state.row.pending_delete_keys, []);
});
