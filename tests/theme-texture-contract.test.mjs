import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const constantsPath = new URL(
  "../src/app/(pages)/theme/constants.ts",
  import.meta.url,
);
const typesPath = new URL("../src/app/(pages)/theme/types.ts", import.meta.url);
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

test("keeps Frost out of the theme texture contract", async () => {
  const [constants, types, sharedTexture, settingsPage] = await Promise.all([
    readFile(constantsPath, "utf8"),
    readFile(typesPath, "utf8"),
    readFile(sharedTexturePath, "utf8"),
    readFile(settingsPagePath, "utf8"),
  ]);

  assert.doesNotMatch(constants, /value: "frost"/);
  assert.doesNotMatch(types, /"frost"/);
  assert.doesNotMatch(sharedTexture, /ThemeFrostTexture/);
  assert.doesNotMatch(settingsPage, /ThemeFrostTexture/);
  await assert.rejects(access(frostTexturePath));
  await assert.rejects(access(frostRendererPath));
});
