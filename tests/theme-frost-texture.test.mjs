import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const constantsPath = new URL(
  "../src/app/(pages)/theme/constants.ts",
  import.meta.url,
);
const typesPath = new URL(
  "../src/app/(pages)/theme/types.ts",
  import.meta.url,
);
const sharedTexturePath = new URL(
  "../src/app/(pages)/theme/shared-theme-texture.tsx",
  import.meta.url,
);
const settingsPagePath = new URL(
  "../src/app/(pages)/theme/theme-settings-page.tsx",
  import.meta.url,
);
const frostTexturePath = new URL(
  "../src/app/(pages)/theme/theme-frost-texture.tsx",
  import.meta.url,
);
const frostRendererPath = new URL(
  "../src/components/canvasui/Frost.tsx",
  import.meta.url,
);

test("makes Frost a persisted background texture", async () => {
  const [constants, types] = await Promise.all([
    readFile(constantsPath, "utf8"),
    readFile(typesPath, "utf8"),
  ]);

  assert.equal(types.includes('"frost"'), true);
  assert.equal(constants.includes('{ label: "霜冻", value: "frost" }'), true);
  assert.equal(constants.includes('value === "frost"'), true);
});

test("keeps Frost behind application content without a scroll hot path", async () => {
  const [sharedTexture, settingsPage, frostTexture, frostRenderer] =
    await Promise.all([
      readFile(sharedTexturePath, "utf8"),
      readFile(settingsPagePath, "utf8"),
      readFile(frostTexturePath, "utf8"),
      readFile(frostRendererPath, "utf8"),
    ]);

  assert.equal(sharedTexture.includes("<ThemeFrostTexture"), true);
  assert.equal(settingsPage.includes('variant="preview"'), true);
  assert.equal(frostTexture.includes('texture !== "frost"'), true);
  assert.equal(frostTexture.includes("quality: 0.4"), true);
  assert.equal(frostTexture.includes("observeScroll: false"), true);
  assert.equal(frostTexture.includes("pixelRatio: 1"), true);
  assert.equal(frostTexture.includes("addEventListener(\"scroll\""), false);
  assert.equal(frostTexture.includes("pointer-events-none"), true);
  assert.equal(frostRenderer.includes("pixelRatio?: number"), true);
});

test("pauses shared Frost rendering while the app is scrolling", async () => {
  const [frostTexture, frostRenderer] = await Promise.all([
    readFile(frostTexturePath, "utf8"),
    readFile(frostRendererPath, "utf8"),
  ]);

  assert.equal(frostTexture.includes("scrollActivityChangeEventName"), true);
  assert.equal(frostTexture.includes("frostInstance.setPaused"), true);
  assert.equal(frostTexture.includes("addEventListener(\"scroll\""), false);
  assert.equal(frostRenderer.includes("setPaused(isPaused)"), true);
  assert.equal(frostRenderer.includes("if (destroyed || paused)"), true);
});
