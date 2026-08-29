import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = new URL(
  "../src/app/(pages)/home/codex-log/codex-log-dashboard.tsx",
  import.meta.url,
);

function getColumn(source, dataIndex, nextDataIndex) {
  const start = source.indexOf(`dataIndex: "${dataIndex}"`);
  const end = source.indexOf(`dataIndex: "${nextDataIndex}"`, start);

  return source.slice(start, end);
}

test("wraps text cells without ellipsis or hover text", async () => {
  const source = await readFile(dashboardPath, "utf8");
  const threadColumn = getColumn(source, "thread_title", "user_tasks");
  const taskColumn = getColumn(source, "user_tasks", "assistant_summary");
  const summaryColumn = getColumn(source, "assistant_summary", "token_count");

  for (const column of [threadColumn, taskColumn, summaryColumn]) {
    assert.equal(column.includes("ellipsis"), false);
    assert.equal(column.includes("tooltip"), false);
    assert.equal(column.includes("title="), false);
    assert.match(column, /whitespace-normal/);
    assert.match(column, /wrap-break-word/);
  }

  assert.equal(source.includes("showSorterTooltip={false}"), true);
});
