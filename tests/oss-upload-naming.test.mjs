import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ossSource = readFileSync(
  new URL("../src/utils/oss.ts", import.meta.url),
  "utf8",
);
const ossPolicySource = readFileSync(
  new URL("../src/app/api/oss/policy/route.ts", import.meta.url),
  "utf8",
);
const dialogSource = readFileSync(
  new URL(
    "../src/app/(pages)/home/clothes/clothes-create-modal.tsx",
    import.meta.url,
  ),
  "utf8",
);
const profileSource = readFileSync(
  new URL("../src/app/(pages)/home/home-profile.tsx", import.meta.url),
  "utf8",
);

test("image uploads can request a business file name", () => {
  assert.match(ossSource, /fileName\?:\s*string/);
  assert.match(ossSource, /const fileName = opts\.fileName \?\? file\.name/);
  assert.match(ossSource, /hasNonAsciiText\(fileName\)/);
  assert.match(ossSource, /fallbackFormData\.append\("fileName", fileName\)/);
  assert.match(
    dialogSource,
    /fileName:\s*createNamedImageFileName\(clothesName,\s*croppedFile\.name\)/,
  );
});

test("avatar uploads request user name png", () => {
  assert.match(
    profileSource,
    /uploadImageToOss\(pendingAvatarFile,\s*\{[\s\S]*fileName:\s*createAvatarFileName\(values\.name\)/,
  );
});

test("OSS policy creates unique name based image keys", () => {
  assert.match(ossPolicySource, /async function createImageObjectKey/);
  assert.match(ossPolicySource, /createUniqueObjectKey/);
  assert.match(ossPolicySource, /`\$\{baseName\}_\$\{index\}\.\$\{extension\}`/);
  assert.doesNotMatch(ossPolicySource, /Date\.now\(\)-\$\{randomUUID\(\)\}/);
});
