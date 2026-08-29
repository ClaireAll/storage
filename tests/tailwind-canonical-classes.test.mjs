import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePaths = {
  blogReader: new URL(
    "../src/app/(pages)/home/blog/blog-reader.tsx",
    import.meta.url,
  ),
  codexDashboard: new URL(
    "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
    import.meta.url,
  ),
  codexPlaceholder: new URL(
    "../src/app/(pages)/home/codex-section-placeholder.tsx",
    import.meta.url,
  ),
  githubReadme: new URL(
    "../src/app/(pages)/home/github-readme-preview-content.tsx",
    import.meta.url,
  ),
  homeDashboard: new URL(
    "../src/app/(pages)/home/home-dashboard.tsx",
    import.meta.url,
  ),
  homeView: new URL(
    "../src/app/(pages)/home/home-view.tsx",
    import.meta.url,
  ),
};

test("uses Tailwind v4 canonical utility forms in reported source files", async () => {
  const [
    blogReader,
    codexDashboard,
    codexPlaceholder,
    githubReadme,
    homeDashboard,
    homeView,
  ] = await Promise.all(
    Object.values(sourcePaths).map((sourcePath) => readFile(sourcePath, "utf8")),
  );

  assert.doesNotMatch(blogReader, /!absolute/);
  assert.match(blogReader, /absolute!/);

  assert.doesNotMatch(codexDashboard, /!mb-0|!text-base|!text-xl|!hidden|!size-14|!rounded-xl|break-words/);
  assert.match(codexDashboard, /mb-0! text-base!/);
  assert.match(codexDashboard, /text-xl!/);
  assert.match(codexDashboard, /hidden!/);
  assert.match(codexDashboard, /size-14! rounded-xl!/);
  assert.match(codexDashboard, /wrap-break-word/);

  assert.doesNotMatch(codexPlaceholder, /border-\[color:var\(--home-preview-border-color\)\]|!mb-2|!text-xl/);
  assert.match(codexPlaceholder, /border-\(--home-preview-border-color\)/);
  assert.match(codexPlaceholder, /mb-2! text-xl!/);

  assert.doesNotMatch(githubReadme, /!mb-0|!text-base|border-\[color:var\(--home-preview-/);
  assert.match(githubReadme, /mb-0! text-base!/);
  assert.match(githubReadme, /border-\(--home-preview-border-soft-color\)/);
  assert.match(githubReadme, /border-\(--home-preview-divider-color\)/);

  assert.doesNotMatch(homeDashboard, /has-\[\[data-investment-dashboard\]\]|!w-full/);
  assert.match(homeDashboard, /has-data-investment-dashboard/);
  assert.match(homeDashboard, /w-full!/);

  assert.doesNotMatch(homeView, /has-\[\[data-investment-dashboard\]\]/);
  assert.match(homeView, /has-data-investment-dashboard/);
});
