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
const homeStylePath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
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

test("uses shared preview tokens for README markdown boundaries", async () => {
  const [source, styles] = await Promise.all([
    readFile(previewContentPath, "utf8"),
    readFile(homeStylePath, "utf8"),
  ]);

  assert.match(styles, /--home-preview-border-color:/);
  assert.match(styles, /--home-preview-border-soft-color:/);
  assert.match(styles, /--home-preview-divider-color:/);
  assert.match(
    source,
    /github-readme-preview-markdown[\s\S]*\[&_h2\]:border-\[color:var\(--home-preview-divider-color\)\]/,
  );
  assert.match(
    source,
    /\[&_blockquote\]:border-\[color:var\(--home-preview-border-soft-color\)\]/,
  );
  assert.match(
    source,
    /\[&_pre\]:border-\[color:var\(--home-preview-border-soft-color\)\]/,
  );
  assert.match(
    source,
    /\[&_td\]:border-\[color:var\(--home-preview-divider-color\)\]/,
  );
  assert.match(
    source,
    /\[&_th\]:border-\[color:var\(--home-preview-divider-color\)\]/,
  );
  assert.match(
    source,
    /\[&_hr\]:border-\[color:var\(--home-preview-divider-color\)\]/,
  );
  assert.match(
    styles,
    /\.github-readme-preview-markdown :where\(h1, h2, h3, h4, h5, h6, hr\)\s*\{[\s\S]*border-color:\s*var\(--home-preview-divider-color\) !important;/,
  );
  assert.match(
    styles,
    /\.github-readme-preview-markdown :where\(table, th, td\)\s*\{[\s\S]*border-color:\s*var\(--home-preview-divider-color\) !important;/,
  );
  assert.match(
    styles,
    /\.github-readme-preview-markdown :where\(pre, blockquote\)\s*\{[\s\S]*border-color:\s*var\(--home-preview-border-soft-color\) !important;/,
  );
});
