import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const layoutSource = readSource("../src/app/layout.tsx");
const loaderSource = readSource(
  "../src/app/(pages)/common/iconfont-script-loader.tsx",
);

test("iconfont symbol script loads after hydration instead of beforeInteractive", () => {
  assert.doesNotMatch(layoutSource, /next\/script/);
  assert.doesNotMatch(layoutSource, /beforeInteractive/);
  assert.match(layoutSource, /IconfontScriptLoader/);
  assert.match(loaderSource, /useEffect/);
  assert.match(loaderSource, /document\.createElement\("script"\)/);
  assert.match(loaderSource, /\/iconfont\/iconfont\.js/);
  assert.match(loaderSource, /document\.body\.appendChild\(script\)/);
});
