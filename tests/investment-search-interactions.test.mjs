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
    [{ instrumentCode: "008888", instrumentType: "fund" }],
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

test("mixed search identifies Shennan Circuits as a stock and ignores index hits", async () => {
  const { parseInvestmentSuggestions } = await loadSearchUtils();
  assert.equal(typeof parseInvestmentSuggestions, "function");
  const rows = parseInvestmentSuggestions({ Datas: [
    { CODE: "002916", NAME: "深南电路", CATEGORY: 150, STOCKMARKET: "2", FundBaseInfo: null },
    { CODE: "008888", NAME: "华夏国证半导体芯片ETF联接C", CATEGORY: 700, FundBaseInfo: { FCODE: "008888" } },
    { CODE: "000001", NAME: "上证指数", CATEGORY: 600, STOCKMARKET: "1", FundBaseInfo: null },
  ] });
  assert.deepEqual(rows.map(row => [row.instrumentCode, row.instrumentType]), [["002916", "stock"], ["008888", "fund"]]);
});

test("a legacy wrong type is corrected by matching code and name, not a numeric prefix", async () => {
  const { matchInvestmentIdentity } = await loadSearchUtils();
  assert.equal(typeof matchInvestmentIdentity, "function");
  const results = [
    { instrumentCode: "000001", instrumentName: "平安银行", instrumentType: "stock" },
    { instrumentCode: "000001", instrumentName: "华夏成长混合", instrumentType: "fund" },
  ];
  assert.equal(matchInvestmentIdentity({ instrumentCode: "000001", instrumentName: "平安银行", instrumentType: "fund" }, results).instrumentType, "stock");
  assert.equal(matchInvestmentIdentity({ instrumentCode: "000001", instrumentName: "华夏成长混合", instrumentType: "fund" }, results).instrumentType, "fund");
  assert.equal(matchInvestmentIdentity({ instrumentCode: "000001", instrumentName: "未知名称", instrumentType: "fund" }, results), null);
});

test("watch status distinguishes a stock and fund sharing the same six-digit code", async () => {
  const { buildInvestmentSearchRows } = await loadSearchUtils();
  const rows = buildInvestmentSearchRows([
    { instrumentCode: "000001", instrumentName: "平安银行", instrumentType: "stock" },
    { instrumentCode: "000001", instrumentName: "华夏成长混合", instrumentType: "fund" },
  ], [{ instrumentCode: "000001", instrumentType: "fund" }], "all");
  assert.deepEqual(rows.map(row => row.isWatched), [false, true]);
});
