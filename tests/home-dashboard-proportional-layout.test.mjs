import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/home-dashboard.tsx",
  import.meta.url,
);

test("uses proportional gutters and shared content boundaries on the home dashboard", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /px-\[clamp\(32px,4vw,88px\)\]/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)\]/);
  assert.match(
    source,
    /has-\[\.ai-assistant-root-expanded\]:grid-cols-\[minmax\(0,1fr\)_clamp\(320px,24vw,420px\)\]/,
  );
  assert.match(
    source,
    /grid-cols-\[clamp\(220px,16vw,300px\)_minmax\(0,1fr\)\]/,
  );
  assert.match(source, /grid-cols-\[72px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(source, /max-w-385/);
  assert.doesNotMatch(source, /minmax\(0,1180px\)/);
  assert.doesNotMatch(source, /home-category-workspace[^"`]*justify-center/);
});
