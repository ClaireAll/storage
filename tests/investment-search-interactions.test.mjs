import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const dashboardUrl = new URL(
  "../src/app/(pages)/home/investment/investment-dashboard.tsx",
  import.meta.url,
);
const searchUtilsUrl = new URL(
  "../src/app/(pages)/home/investment/investment-search-utils.ts",
  import.meta.url,
);

async function loadSearchUtils() {
  const source = await readFile(searchUtilsUrl, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;

  return import(moduleUrl);
}

test("keeps one accessible search entry and removes the standalone add entry", async () => {
  const source = await readFile(dashboardUrl, "utf8");

  assert.equal(source.match(/placeholder="搜索代码\/名称"/g)?.length, 1);
  assert.match(source, /id="investment-search-input"/);
  assert.match(source, /name="investmentSearch"/);
  assert.doesNotMatch(source, /isAddDrawerOpen|setIsAddDrawerOpen|title="添加关注"/);
});

test("marks search results that already exist in the watchlist", async () => {
  const { buildInvestmentSearchRows } = await loadSearchUtils();
  assert.equal(typeof buildInvestmentSearchRows, "function");

  const rows = buildInvestmentSearchRows(
    [
      { instrumentCode: "008888", instrumentName: "华夏国证半导体芯片ETF联接C", instrumentType: "fund" },
      { instrumentCode: "000021", instrumentName: "深科技", instrumentType: "stock" },
    ],
    [{ instrumentCode: "008888" }],
    "all",
  );

  assert.deepEqual(
    rows.map(({ instrumentCode, isWatched }) => ({ instrumentCode, isWatched })),
    [
      { instrumentCode: "008888", isWatched: true },
      { instrumentCode: "000021", isWatched: false },
    ],
  );
});

test("filters fuzzy search results with the active instrument type", async () => {
  const { buildInvestmentSearchRows } = await loadSearchUtils();
  assert.equal(typeof buildInvestmentSearchRows, "function");

  const rows = buildInvestmentSearchRows(
    [
      { instrumentCode: "008888", instrumentName: "华夏国证半导体芯片ETF联接C", instrumentType: "fund" },
      { instrumentCode: "008281", instrumentName: "国泰CES半导体芯片行业ETF联接A", instrumentType: "fund" },
      { instrumentCode: "000021", instrumentName: "深科技", instrumentType: "stock" },
    ],
    [],
    "stock",
  );

  assert.deepEqual(rows.map((row) => row.instrumentCode), ["000021"]);
});

test("splits every case-insensitive keyword match into highlighted segments", async () => {
  const { splitSearchHighlight } = await loadSearchUtils();
  assert.equal(typeof splitSearchHighlight, "function");

  assert.deepEqual(splitSearchHighlight("芯片ETF芯片", " 芯片 "), [
    { highlighted: true, text: "芯片" },
    { highlighted: false, text: "ETF" },
    { highlighted: true, text: "芯片" },
  ]);
  assert.deepEqual(splitSearchHighlight("ChipLink", "chip"), [
    { highlighted: true, text: "Chip" },
    { highlighted: false, text: "Link" },
  ]);
});
