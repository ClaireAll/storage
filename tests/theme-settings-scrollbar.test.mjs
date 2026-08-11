import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL(
  "../src/app/(pages)/theme/theme-settings-page.tsx",
  import.meta.url,
);
const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/theme-settings.less",
  import.meta.url,
);

test("keeps theme settings scrollable without exposing a native scrollbar", async () => {
  const [pageSource, stylesSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.equal(
    pageSource.includes(
      "theme-settings-shell flex h-dvh min-h-0 flex-1 flex-col overflow-x-hidden! overflow-y-auto! [scrollbar-gutter:auto] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    ),
    true,
  );
  assert.equal(pageSource.includes("使用浅色、深色，或匹配系统设置"), false);
  assert.equal(stylesSource.includes(".theme-settings-subtitle {"), false);
});
