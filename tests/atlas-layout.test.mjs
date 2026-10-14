import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

test("bounded layout handles a thousand nodes and preserves fixed positions", async () => {
  const source = await readFile(
    new URL(
      "../src/app/(pages)/home/atlas/atlas-layout.worker.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const require = createRequire(import.meta.url);
  const compiled = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(
      'from "d3-force"',
      `from ${JSON.stringify(pathToFileURL(require.resolve("d3-force")).href)}`,
    );
  let positions;
  const previous = globalThis.self;
  globalThis.self = {
    postMessage(value) {
      positions = value;
    },
  };
  try {
    await import(
      `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
    );
    const nodes = Array.from({ length: 1000 }, (_, index) => ({
      id: String(index),
      position: { x: (index % 40) * 80, y: Math.floor(index / 40) * 80 },
      fixed: index === 0,
    }));
    const edges = nodes
      .slice(1)
      .map((node, index) => ({ source: String(index), target: node.id }));
    globalThis.self.onmessage({ data: { nodes, edges } });
    assert.equal(positions.length, 1000);
    assert.deepEqual(positions[0].position, nodes[0].position);
    assert(
      positions.every(
        (node) =>
          Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
      ),
    );
  } finally {
    globalThis.self = previous;
  }
});
