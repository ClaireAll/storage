import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-create-modal.tsx", import.meta.url),
  "utf8",
);
const runtimeCopySource = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

test("item edit dialog runtime copy has no mojibake text", () => {
  assert.doesNotMatch(
    runtimeCopySource,
    /璇|鍥|棰滆壊|澶辫触|淇濆瓨|鍒犻櫎|鍙栨秷|绮|鎷|涓婁紶|€|俙/,
  );
});

test("item edit dialog keeps the expected Chinese action copy", () => {
  assert.match(runtimeCopySource, /请选择图片文件/);
  assert.match(runtimeCopySource, /图片大小不能超过 5MB/);
  assert.match(runtimeCopySource, /请先选择分类/);
  assert.match(runtimeCopySource, /请上传\$\{itemLabel\}图片/);
  assert.match(runtimeCopySource, /保存成功/);
  assert.match(runtimeCopySource, /删除/);
  assert.match(runtimeCopySource, /取消/);
  assert.match(runtimeCopySource, /保存/);
});
