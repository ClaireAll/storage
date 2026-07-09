import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sharedTextureSource = readFileSync(
  new URL("../src/app/(pages)/theme/shared-theme-texture.tsx", import.meta.url),
  "utf8",
);
const homeViewSource = readFileSync(
  new URL("../src/app/(pages)/home/home-view.tsx", import.meta.url),
  "utf8",
);
const themeSettingsSource = readFileSync(
  new URL("../src/app/(pages)/theme/theme-settings-page.tsx", import.meta.url),
  "utf8",
);
const baseTextureStyleSource = readFileSync(
  new URL("../src/app/(pages)/theme/styles/base-texture.less", import.meta.url),
  "utf8",
);

test("shared texture keeps the latest published detail so initial events cannot be lost", () => {
  assert.match(sharedTextureSource, /let latestThemeTextureDetail/);
  assert.match(
    sharedTextureSource,
    /useState\([\s\S]*\(\) => latestThemeTextureDetail[\s\S]*\)/,
  );
  assert.match(sharedTextureSource, /publishThemeTextureDetail/);
  assert.match(
    sharedTextureSource,
    /latestThemeTextureDetail = nextTextureDetail/,
  );
  assert.match(
    sharedTextureSource,
    /syncTextureDetail\(latestThemeTextureDetail\)/,
  );
});

test("page shells render geometry and meteor layers inside the visible stacking context", () => {
  assert.match(homeViewSource, /ThemeGeometryTexture/);
  assert.match(homeViewSource, /ThemeFallingLights/);
  assert.match(homeViewSource, /texture=\{themeConfig\.texture\}/);
  assert.match(
    homeViewSource,
    /isActive=\{themeConfig\.texture === "meteor"\}/,
  );
  assert.match(themeSettingsSource, /texture=\{appliedTexture\}/);
  assert.match(
    themeSettingsSource,
    /isActive=\{appliedTexture === "meteor"\}/,
  );
  assert.match(
    baseTextureStyleSource,
    /app-textured-shell > \.theme-geometry-texture[\s\S]*z-index:\s*0/,
  );
  assert.match(
    baseTextureStyleSource,
    /app-textured-shell > \.theme-meteor-lines[\s\S]*z-index:\s*0/,
  );
});

test("reduced motion does not disable selected meteor and geometry textures", () => {
  assert.doesNotMatch(
    baseTextureStyleSource,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.theme-(meteor|geometry)[\s\S]*animation-duration:\s*1ms !important/,
  );
  assert.doesNotMatch(
    baseTextureStyleSource,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.theme-(meteor|geometry)[\s\S]*animation:\s*none !important/,
  );
});

test("meteor texture keeps falling in normal motion mode", () => {
  assert.match(
    baseTextureStyleSource,
    /\.theme-meteor-line\s*\{[\s\S]*animation:\s*theme-meteor-drop var\(--falling-line-duration\) linear\s*var\(--falling-line-delay\) infinite both/,
  );
  assert.match(
    baseTextureStyleSource,
    /\.theme-meteor-spark\s*\{[\s\S]*animation:\s*theme-meteor-spark-twinkle var\(--meteor-spark-duration\) ease-in-out\s*var\(--meteor-spark-delay\) infinite both/,
  );
  assert.doesNotMatch(
    baseTextureStyleSource,
    /\.theme-meteor-line\s*\{[\s\S]*var\(--falling-line-delay\) 1 both/,
  );
});
