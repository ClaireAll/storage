import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);

test("styles Codex table scrollbars with the active theme instead of browser defaults", async () => {
  const stylesSource = await readFile(stylesPath, "utf8");

  assert.equal(
    stylesSource.includes(
      ".codex-log-dashboard .ant-table-content,\n.codex-log-dashboard .ant-table-body {",
    ),
    true,
  );
  assert.equal(stylesSource.includes("scrollbar-width: thin;"), true);
  assert.equal(
    stylesSource.includes(
      ".codex-log-dashboard .ant-table-content::-webkit-scrollbar-button,",
    ),
    true,
  );
  assert.equal(stylesSource.includes("height: 8px;"), true);
  assert.equal(stylesSource.includes("width: 8px;"), true);
  assert.equal(stylesSource.includes("var(--home-theme-color) 42%"), true);
});
