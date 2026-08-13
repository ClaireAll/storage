import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesPath = new URL(
  "../src/app/(pages)/theme/styles/home.less",
  import.meta.url,
);
const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

test("uses the common overlay scrollbar for the Codex table instead of browser defaults", async () => {
  const [stylesSource, dashboardSource] = await Promise.all([
    readFile(stylesPath, "utf8"),
    readFile(dashboardPath, "utf8"),
  ]);

  assert.equal(stylesSource.includes("scrollbar-width: thin;"), false);
  assert.equal(stylesSource.includes("height: 8px;"), false);
  assert.equal(stylesSource.includes("width: 8px;"), false);
  assert.equal(stylesSource.includes(".codex-log-dashboard .ant-table-content"), true);
  assert.match(
    dashboardSource,
    /horizontalTargetSelector="\.ant-table-content"/,
  );
  assert.match(dashboardSource, /targetSelector="\.ant-table-body"/);
});
