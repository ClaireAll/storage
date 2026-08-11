import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

test("places the shared fullscreen action beside the Codex log title", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const titleIndex = source.indexOf("日报");
  const toolbarActionsIndex = source.indexOf("codex-log-toolbar-actions");
  const titleRegion = source.slice(titleIndex, toolbarActionsIndex);

  assert.equal(
    source.includes('from "../home-content-fullscreen"'),
    true,
  );
  assert.equal(titleRegion.includes("<HomeContentFullscreenButton />"), true);
});
