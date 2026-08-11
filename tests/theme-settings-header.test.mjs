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
  assert.equal(pageSource.includes("home-brand-header theme-settings-header"), true);
  assert.equal(stylesSource.includes(".theme-settings-header {"), false);
});
