import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".less",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const mojibakeTokens = [
  "\u7487",
  "\u9428",
  "\u9345",
  "\u7f02",
  "\u7441",
  "\u741b",
  "\u93c3",
  "\u93b6",
  "\u9356",
  "\u9416",
  "\u701b",
  "\u9239",
  "\u9241",
  "\ufffd",
];

function walkTextFiles(directory) {
  const files = [];

  for (const name of readdirSync(directory)) {
    if (ignoredDirectories.has(name)) {
      continue;
    }

    const filePath = join(directory, name);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      files.push(...walkTextFiles(filePath));
      continue;
    }

    if (textExtensions.has(extname(filePath))) {
      files.push(filePath);
    }
  }

  return files;
}

test("project text files do not contain common Chinese mojibake", () => {
  const hits = [];

  for (const filePath of walkTextFiles(".")) {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (mojibakeTokens.some((token) => line.includes(token))) {
        hits.push(`${filePath}:${index + 1}:${line.trim()}`);
      }
    });
  }

  assert.deepEqual(hits, []);
});
