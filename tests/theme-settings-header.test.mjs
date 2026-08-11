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

test("uses the home glass header for theme settings", async () => {
  const [pageSource, stylesSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);

  assert.equal(pageSource.includes("const homeHeaderBackground = mixHexColor("), true);
  assert.equal(pageSource.includes('"--home-header-bg": homeHeaderBackground,'), true);
  assert.equal(pageSource.includes('"--home-theme-color": appliedPalette.color,'), true);
  assert.equal(pageSource.includes('"--home-theme-text": appliedPalette.text,'), true);
  const headerStart = pageSource.indexOf("<header");
  const headerEnd = pageSource.indexOf("</header>", headerStart);
  const headerSource = pageSource.slice(headerStart, headerEnd);

  assert.equal(
    headerSource.includes(
      "home-brand-header theme-settings-header relative z-3 flex h-11",
    ),
    true,
  );
  assert.equal(
    headerSource.includes("使用浅色、深色，或匹配系统设置"),
    false,
  );
  assert.equal(headerSource.includes("max-md:flex-col"), false);
  assert.equal(stylesSource.includes(".theme-settings-header {"), false);
});

test("uses an icon-only save button aligned with the home header actions", async () => {
  const [pageSource, stylesSource] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(stylesPath, "utf8"),
  ]);
  const saveIconIndex = pageSource.indexOf("icon={<SaveOutlined />}");
  const saveButtonStart = pageSource.lastIndexOf("<Button", saveIconIndex);
  const saveButtonEnd = pageSource.indexOf("\n            />", saveIconIndex);
  const saveButtonSource = pageSource.slice(saveButtonStart, saveButtonEnd);

  assert.notEqual(saveIconIndex, -1);
  assert.equal(
    saveButtonSource.includes('className="theme-settings-icon-button"'),
    true,
  );
  assert.equal(saveButtonSource.includes('aria-label="保存主题"'), true);
  assert.equal(saveButtonSource.includes('type="primary"'), true);
  assert.equal(saveButtonSource.includes('variant="solid"'), true);
  assert.equal(saveButtonSource.includes('variant="outlined"'), false);
  assert.notEqual(saveButtonEnd, -1);
  assert.equal(pageSource.slice(saveButtonEnd + 13, saveButtonEnd + 15), "/>");
  assert.equal(pageSource.includes('className="theme-settings-save"'), false);
  assert.equal(stylesSource.includes(".theme-settings-save"), false);
});
