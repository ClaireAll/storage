import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-create-modal.tsx", import.meta.url),
  "utf8",
);
const runtimeCopySource = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
const clothesStyleSource = readFileSync(
  new URL("../src/app/(pages)/theme/styles/clothes.less", import.meta.url),
  "utf8",
);
const gallerySource = readFileSync(
  new URL("../src/app/(pages)/home/clothes/clothes-gallery.tsx", import.meta.url),
  "utf8",
);
test("item edit dialog runtime copy has no mojibake text", () => {
  assert.doesNotMatch(
    runtimeCopySource,
    /\u7487|\u9365|\u68f0\u6ed1\u58ca|\u6fb6\u8fb1\u89e6|\u6dc7\u6fe8\u74e8|\u9352\u72b5\u6aee|\u9359\u6828\u6d88|\u7eee|\u93b7|\u6d93\u5a41\u7d36|\u20ac|\u4fd9/,
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

test("image uploader preview border uses translucent theme color", () => {
  assert.match(
    clothesStyleSource,
    /border-color:\s*color-mix\(\s*in srgb,\s*var\(--clothes-create-theme-color\) 30%,\s*transparent\s*\)/,
  );
});

test("card view item border uses translucent home theme color", () => {
  assert.match(
    gallerySource,
    /borderColor:\s*"color-mix\(in srgb, var\(--home-theme-color\) 30%, transparent\)"/,
  );
});
