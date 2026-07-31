import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scriptSource = readFileSync(
  new URL("../scripts/rename-oss-images.mjs", import.meta.url),
  "utf8",
);

test("OSS image rename migration is dry-run by default", () => {
  assert.match(scriptSource, /const shouldExecute = process\.argv\.includes\("--execute"\)/);
  assert.match(scriptSource, /DRY-RUN/);
  assert.match(scriptSource, /--execute/);
});

test("OSS image rename migration covers avatars and item pictures", () => {
  assert.match(scriptSource, /table:\s*"users"[\s\S]*urlColumn:\s*"avatar"/);
  assert.match(scriptSource, /table:\s*"clothes"[\s\S]*urlColumn:\s*"pic_url"/);
  assert.match(scriptSource, /table:\s*"skincare"[\s\S]*urlColumn:\s*"pic_url"/);
  assert.doesNotMatch(scriptSource, /download_url/);
});

test("OSS image rename migration uses name based collision keys", () => {
  assert.match(scriptSource, /createTargetFileName\([\s\S]*record\.name/);
  assert.match(scriptSource, /createUniqueObjectKey/);
  assert.match(scriptSource, /`\$\{baseName\}_\$\{index\}\.\$\{extension\}`/);
  assert.match(scriptSource, /copyOssObject/);
  assert.match(scriptSource, /deleteOssObject/);
});

test("OSS image rename migration is idempotent for numbered duplicates", () => {
  assert.match(scriptSource, /function isAlreadyNamedObjectKey/);
  assert.match(scriptSource, /namedPattern = new RegExp/);
  assert.match(scriptSource, /escapeRegExp\(baseName\)[\s\S]*escapeRegExp\(extension\)/);
  assert.match(scriptSource, /isAlreadyNamedObjectKey\(sourceKey,\s*requestedFileName\)/);
});
