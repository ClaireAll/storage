import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pluginPagePath = new URL(
  "../src/app/(pages)/home/codex-plugin/page.tsx",
  import.meta.url,
);
const skillsPagePath = new URL(
  "../src/app/(pages)/home/codex-skills/page.tsx",
  import.meta.url,
);
const previewPath = new URL(
  "../src/app/(pages)/home/github-readme-preview.tsx",
  import.meta.url,
);
const previewContentPath = new URL(
  "../src/app/(pages)/home/github-readme-preview-content.tsx",
  import.meta.url,
);

test("renders the chrome-plugin README in the Plugin section", async () => {
  const source = await readFile(pluginPagePath, "utf8");

  assert.equal(source.includes("GitHubReadmePreview"), true);
  assert.equal(source.includes("ClaireAll/chrome-plugin"), true);
  assert.equal(source.includes("CodexSectionPlaceholder"), false);
});

test("renders the skills README in the Skills section", async () => {
  const source = await readFile(skillsPagePath, "utf8");

  assert.equal(source.includes("GitHubReadmePreview"), true);
  assert.equal(source.includes("ClaireAll/skills"), true);
  assert.equal(source.includes("CodexSectionPlaceholder"), false);
});

test("keeps server fetching separate from Ant Design README rendering", async () => {
  const source = await readFile(previewPath, "utf8");

  assert.equal(source.includes('from "antd"'), false);
  assert.equal(source.includes('from "@ant-design/icons"'), false);
  assert.equal(
    source.includes('from "./github-readme-preview-content"'),
    true,
  );
});

test("adds the shared fullscreen action to Plugin and Skills README previews", async () => {
  const source = await readFile(previewContentPath, "utf8");

  assert.equal(
    source.includes('from "./home-content-fullscreen"'),
    true,
  );
  assert.equal(source.includes("<HomeContentFullscreenButton />"), true);
});
