import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const controlPath = new URL(
  "../src/app/(pages)/home/share/hobby-share-control.tsx",
  import.meta.url,
);
const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/hobby-share.less",
  import.meta.url,
);

test("uses a concise sharing tooltip and theme-aligned outlined trigger", async () => {
  const [source, stylesSource] = await Promise.all([
    readFile(controlPath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);
  const triggerStart = stylesSource.indexOf(".home-hobby-share-trigger {");
  const triggerEnd = stylesSource.indexOf("\n}\n", triggerStart);
  const triggerSource = stylesSource.slice(triggerStart, triggerEnd);

  assert.equal(source.includes('<Tooltip title="分享">'), true);
  assert.equal(source.includes('variant="outlined"'), true);
  assert.equal(source.includes('<Tooltip title="分享爱好页面">'), false);
  assert.equal(source.includes('type="primary"'), false);
  assert.equal(triggerSource.includes("border-radius: 8px;"), false);
  assert.equal(
    triggerSource.includes(
      "var(--home-theme-bg) 88%,\n    var(--home-theme-color) 12%",
    ),
    true,
  );
  assert.equal(
    stylesSource.includes(
      ".home-hobby-share-trigger:hover,\n.home-hobby-share-trigger:focus-visible {",
    ),
    true,
  );
});
