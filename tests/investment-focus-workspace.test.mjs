import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../src/app/(pages)/home/investment/", import.meta.url);
function load(name, fetcher = fetch) {
  const compiled = ts.transpileModule(readFileSync(new URL(`${name}.ts`, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = id => id === "server-only" ? {} : id.startsWith("./") ? load(id.slice(2), fetcher) : require(id);
  Function("require", "module", "exports", "fetch", compiled)(localRequire, mod, mod.exports, fetcher);
  return mod.exports;
}
const utils = load("investment-utils");
const now = new Date("2026-10-15T02:38:00Z");
const entries = [
  { id: "stock", instrumentCode: "000001", instrumentType: "stock", quote: { price: 11.28 } },
  { id: "fund", instrumentCode: "000001", instrumentType: "fund", quote: { price: 1.2034 } },
];

test("selection follows an id, survives quote refresh and never confuses equal stock/fund codes", () => {
  assert.equal(typeof utils.getSelectedInvestmentEntry, "function");
  assert.equal(utils.getSelectedInvestmentEntry(entries, "all", "fund").id, "fund");
  const refreshed = [{ ...entries[0], quote: { price: 11.29 } }, entries[1]];
  assert.equal(utils.getSelectedInvestmentEntry(refreshed, "all", "stock").quote.price, 11.29);
  assert.equal(utils.getSelectedInvestmentEntry([...entries].reverse(), "all", "stock").id, "stock");
});

test("filtering and removing the selected item use the first visible entry and empty lists have no detail", () => {
  assert.equal(typeof utils.getSelectedInvestmentEntry, "function");
  assert.equal(utils.getSelectedInvestmentEntry(entries, "fund", "stock").id, "fund");
  assert.equal(utils.getSelectedInvestmentEntry(entries, "all", "stock").id, "stock");
  assert.equal(utils.getSelectedInvestmentEntry([entries[1]], "all", "stock").id, "fund");
  assert.equal(utils.getSelectedInvestmentEntry([entries[1]], "stock", "stock"), undefined);
  assert.equal(utils.getSelectedInvestmentEntry([], "all", "stock"), undefined);
});

test("fallback selection becomes persistent after deletion, initial addition, and a filter-specific reorder", () => {
  assert.equal(typeof utils.resolveInvestmentSelection, "function");
  const third = { ...entries[0], id: "third", instrumentCode: "000725" };
  const afterDelete = utils.resolveInvestmentSelection([entries[1], third], { all: "stock" });
  assert.equal(afterDelete.all, "fund");
  assert.equal(utils.resolveInvestmentSelection([third, entries[1]], afterDelete).all, "fund");
  const afterAdd = utils.resolveInvestmentSelection(entries, {});
  assert.equal(afterAdd.all, "stock");
  assert.equal(utils.resolveInvestmentSelection([...entries].reverse(), afterAdd).all, "stock");
  const filters = utils.resolveInvestmentSelection([entries[1], entries[0], third], { all: "fund" });
  assert.equal(filters.stock, "stock");
  assert.equal(utils.resolveInvestmentSelection([third, entries[0], entries[1]], filters).stock, "stock");
});

test("quote prices retain stock precision and fund precision without inventing a missing price", () => {
  assert.equal(typeof utils.formatInvestmentPrice, "function");
  assert.equal(utils.formatInvestmentPrice({ kind: "stock", price: 158.36 }, "stock"), "158.36");
  assert.equal(utils.formatInvestmentPrice({ kind: "estimate", price: 1.2034 }, "fund"), "1.2034");
  for (const price of [null, undefined, NaN, Infinity, 0, -1]) {
    assert.equal(utils.formatInvestmentPrice({ kind: "stock", price }, "stock"), "--");
  }
  assert.equal(utils.formatInvestmentPrice({ kind: "unavailable", price: 100 }, "stock"), "--");
});

test("stock and fund quote parsers read the price matching the actual quote kind", () => {
  const fields = Array(33).fill("");
  fields[2] = "002916"; fields[3] = "158.36"; fields[30] = "20261015103800"; fields[32] = "-3.31";
  assert.equal(utils.parseTencentStockQuotes(`v_sz002916="${fields.join("~")}";`, now).get("002916").price, 158.36);
  assert.equal(utils.parseFundValuation({ GSZ: 1.2034, NAV: 1.3, GSZZL: -3.1, GZTIME: "2026-10-15 10:38" }, now).price, 1.2034);
  assert.equal(utils.parseFundValuation({ GSZ: "--", NAV: 1.3, GSZZL: -3.1 }, now).price, null);
  assert.equal(utils.parseEastmoneyStockQuote({ data: { f43: 15836, f59: 2, f170: -331 } }, now).price, 158.36);
  assert.equal(utils.parseEastmoneyStockQuote({ data: { f43: "-", f59: 2 } }, now).price, null);
});

test("display freshness uses the actual source time: stale, missing and implausibly future timestamps are never live", () => {
  for (const updatedAt of ["2026-10-14 15:00:00", "2026-10-15 10:30:00", "2026-10-15 10:45:00", null]) {
    const quote = { kind: "stock", price: 10, changePercent: 1, isLive: true, source: "test", updatedAt };
    assert.equal(utils.getInvestmentQuoteLabel(quote, now), "行情延迟");
  }
  const nav = { kind: "nav", price: 1.6, changePercent: 1, isLive: true, source: "test", updatedAt: "2026-10-15 10:38:00" };
  assert.equal(utils.getInvestmentQuoteLabel(nav, now), "已公布净值");
  const estimate = utils.parseFundValuation({ GSZ: 1.5, GSZZL: 1, GZTIME: "2026-10-15 10:38" }, now);
  assert.equal(utils.getInvestmentQuoteLabel(estimate, now), "盘中估值");
});

test("polling wakes at the morning and afternoon opening instead of waiting out the closed-market backoff", () => {
  assert.equal(typeof utils.getInvestmentNextRefreshDelay, "function");
  assert.equal(utils.getInvestmentNextRefreshDelay(new Date("2026-10-15T01:29:50Z")), 10_000);
  assert.equal(utils.getInvestmentNextRefreshDelay(new Date("2026-10-15T04:59:55Z")), 5_000);
  assert.equal(utils.getInvestmentNextRefreshDelay(new Date("2026-10-15T02:12:00Z")), 15_000);
  assert.equal(utils.getInvestmentNextRefreshDelay(new Date("2026-10-17T01:29:50Z")), 300_000);
});

test("intraday detail retains the complete real minute samples and pairs prices with their actual times", async () => {
  const samples = Array.from({ length: 30 }, (_, index) => `10${String(index).padStart(2, "0")} ${160 - index / 100} 100`);
  samples.splice(3, 0, "1003 -- 100");
  const provider = load("investment-quotes", async input => {
    const url = String(input);
    if (url.includes("minute/query")) return Response.json({ data: { sz002916: { data: { data: samples, date: "20261015" } } } });
    if (url.includes("qt.gtimg")) {
      const fields = Array(33).fill("");
      fields[2] = "002916"; fields[3] = "158.36"; fields[30] = "20261015103800"; fields[32] = "-3.31";
      return new Response(`v_sz002916="${fields.join("~")}";`);
    }
    throw new Error(`unexpected request ${url}`);
  });
  const [row] = await provider.getInvestmentQuotes([{ instrumentCode: "002916", instrumentType: "stock" }], { now });
  assert.equal(row.trend.length, 30);
  assert.equal(row.trendLabels.length, 30);
  assert.deepEqual(row.trendLabels.slice(0, 4), ["10:00", "10:01", "10:02", "10:03"]);
  assert.equal(row.trendLabels.at(-1), "10:29");
  assert.equal(row.trend.at(-1), 159.71);
  assert.equal(row.trendDate, "2026-10-15");
});

test("published fund NAV supplies its own price and historical dates, not intraday clock labels", async () => {
  const provider = load("investment-quotes", async input => {
    const url = String(input);
    if (url.includes("FundValuationLast")) return Response.json({ success: true, data: [] });
    if (url.includes("pingzhongdata")) return new Response('var Data_netWorthTrend = [{"x":1791820800000,"y":1.6,"equityReturn":1},{"x":1791907200000,"y":1.5623,"equityReturn":-0.07}];');
    throw new Error(`unexpected request ${url}`);
  });
  const [row] = await provider.getInvestmentQuotes([{ instrumentCode: "110022", instrumentType: "fund" }], { now });
  assert.equal(row.quote.kind, "nav");
  assert.equal(row.quote.price, 1.5623);
  assert.deepEqual(row.trendLabels, ["2026-10-13", "2026-10-14"]);
});

test("chart uses real prices and sample labels and never creates a mismatched percent axis", () => {
  assert.equal(typeof utils.buildInvestmentChartOptions, "function");
  const option = utils.buildInvestmentChartOptions([162, 158.36], ["09:30", "10:38"], {
    text: "#111111", grid: "#dddddd", background: "#ffffff", line: "#059669",
  });
  assert.deepEqual(option.xAxis.data, ["09:30", "10:38"]);
  assert.deepEqual(option.series[0].data, [162, 158.36]);
  assert.equal(option.yAxis.scale, true);
  assert.equal(Array.isArray(option.yAxis), false);
  assert.equal(option.series[0].connectNulls, false);
});

test("fresh sample labels replace old labels together with prices and failure preserves the matching pair", () => {
  const quote = { kind: "stock", price: 10, changePercent: 1, updatedAt: "2026-10-15 10:37:00", source: "test" };
  const data = { watchlist: [{ ...entries[0], quote, trend: [10], trendLabels: ["10:37"] }], recommended: [] };
  const update = { instrumentType: "stock", instrumentCode: "000001", quote: { ...quote, updatedAt: "2026-10-15 10:38:00" }, trend: [11], trendLabels: ["10:38"] };
  const next = utils.mergeInvestmentQuotes(data, { quotes: [update] });
  assert.deepEqual(next.watchlist[0].trendLabels, ["10:38"]);
  const failed = utils.mergeInvestmentQuotes(next, { quotes: [{ ...update, quote: utils.unavailableInvestmentQuote(), trend: [], trendLabels: [] }] });
  assert.deepEqual(failed.watchlist[0].trend, [11]);
  assert.deepEqual(failed.watchlist[0].trendLabels, ["10:38"]);
});

test("today's successful quote cannot reuse yesterday's minute curve when the minute request fails", () => {
  const quote = { kind: "stock", price: 10, changePercent: 1, updatedAt: "2026-10-14 15:00:00", source: "test" };
  const item = { ...entries[0], quote, trend: [9, 10], trendLabels: ["09:30", "15:00"], trendDate: "2026-10-14" };
  const next = utils.mergeInvestmentQuotes({ watchlist: [item], recommended: [] }, { quotes: [{
    instrumentType: "stock", instrumentCode: "000001", quote: { ...quote, price: 11, updatedAt: "2026-10-15 09:31:00" }, trend: [], trendLabels: [],
  }] });
  assert.equal(next.watchlist[0].quote.price, 11);
  assert.deepEqual(next.watchlist[0].trend, []);
  assert.deepEqual(next.watchlist[0].trendLabels, []);
});

test("an upstream minute curve from a different trading day is not combined with a newer quote", () => {
  const quote = { kind: "stock", price: 11, changePercent: 1, updatedAt: "2026-10-15 09:31:00", source: "test" };
  const next = utils.mergeInvestmentQuotes({ watchlist: [{ ...entries[0], quote, trend: [] }], recommended: [] }, { quotes: [{
    instrumentType: "stock", instrumentCode: "000001", quote, trend: [9, 10], trendLabels: ["09:30", "15:00"], trendDate: "2026-10-14",
  }] });
  assert.deepEqual(next.watchlist[0].trend, []);
});

test("watchlist history is retained on a full-refresh failure even when the same instrument is also recommended", () => {
  const quote = { kind: "stock", price: 10, changePercent: 1, updatedAt: "2026-10-15 10:37:00", source: "test" };
  const item = { ...entries[0], quote, trend: [9, 10], trendLabels: ["10:36", "10:37"], trendDate: "2026-10-15" };
  const current = { watchlist: [item], recommended: [{ instrumentCode: "000001", instrumentType: "stock", quote }] };
  const incoming = { watchlist: [{ ...item, quote: utils.unavailableInvestmentQuote(), trend: [], trendLabels: [] }], recommended: [] };
  const next = utils.mergeInvestmentDashboard(current, incoming);
  assert.deepEqual(next.watchlist[0].trend, [9, 10]);
  assert.deepEqual(next.watchlist[0].trendLabels, ["10:36", "10:37"]);
  assert.equal(next.watchlist[0].trendDate, "2026-10-15");
});

test("a full-refresh watchlist curve wins over a duplicate recommendation that carries only a quote", () => {
  const quote = { kind: "stock", price: 10, changePercent: 1, updatedAt: "2026-10-15 10:37:00", source: "test" };
  const currentItem = { ...entries[0], quote, trend: [9, 10], trendLabels: ["10:36", "10:37"], trendDate: "2026-10-15" };
  const newQuote = { ...quote, price: 11, updatedAt: "2026-10-15 10:38:00" };
  const next = utils.mergeInvestmentDashboard({ watchlist: [currentItem], recommended: [] }, {
    watchlist: [{ ...currentItem, quote: newQuote, trend: [10, 11], trendLabels: ["10:37", "10:38"] }],
    recommended: [{ instrumentCode: "000001", instrumentType: "stock", quote: newQuote }],
  });
  assert.equal(next.watchlist[0].quote.price, 11);
  assert.deepEqual(next.watchlist[0].trend, [10, 11]);
  assert.deepEqual(next.watchlist[0].trendLabels, ["10:37", "10:38"]);
});

test("workspace owns one stable vertical scrollport with no page-level scroll state or layout reads in scroll callbacks", () => {
  const source = readFileSync(new URL("investment-dashboard.tsx", root), "utf8");
  assert.equal((source.match(/<OverlayScrollArea\b/g) ?? []).length, 1);
  assert.match(source, /investment-dashboard-shell[^"\n]*overflow-hidden/);
  assert.match(source, /viewportClassName="[^"]*overflow-x-hidden[^\"]*\[scrollbar-gutter:stable\]/);
  assert.doesNotMatch(source, /addEventListener\(["']scroll|onScroll=|setScroll|useState[^\n]*[Ss]croll/);
});

test("watchlist and quote detail stretch to the same row height without independent sticky offsets", async () => {
  const { compile } = require("tailwindcss");
  const themeCss = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const source = readFileSync(new URL("investment-dashboard.tsx", root), "utf8");
  const gridClasses = source.match(/"(investment-dashboard-grid[^"\n]*)"/)?.[1];
  const detailClasses = source.match(/"(investment-detail-panel[^"\n]*)"/)?.[1];
  assert.ok(gridClasses);
  assert.ok(detailClasses);

  const gridCompiler = await compile(`${themeCss}\n@tailwind utilities;`);
  const gridCss = gridCompiler.build(gridClasses.split(/\s+/));
  assert.match(gridCss, /align-items:\s*stretch/);
  assert.doesNotMatch(gridCss, /align-items:\s*(?:start|flex-start)/);

  const detailCompiler = await compile(`${themeCss}\n@tailwind utilities;`);
  const detailCss = detailCompiler.build(detailClasses.split(/\s+/));
  assert.doesNotMatch(detailCss, /position:\s*(?:sticky|absolute|fixed)|align-self:\s*(?:start|flex-start)|height:\s*(?:\d|clamp\()/);
});

test("Tailwind generates the responsive split, stable scroll gutter, chart height and both theme surfaces", async () => {
  const { compile } = require("tailwindcss");
  const themeCss = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const source = ["investment-dashboard.tsx", "investment-detail-panel.tsx"].map(name => readFileSync(new URL(name, root), "utf8")).join("\n");
  const candidates = [...source.matchAll(/"([^"\n]*)"/g)].flatMap(match => match[1].split(/\s+/));
  const compiler = await compile(`${themeCss}\n@tailwind utilities;`);
  const css = compiler.build(candidates);
  assert.match(css, /@container investment-workspace \(width >= 900px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(300px,\s*380px\)\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /height:\s*clamp\(280px,\s*34vh,\s*420px\)/);
  assert.match(css, /var\(--home-theme-bg\) 18%,\s*#ffffff 82%/);
  assert.match(css, /var\(--home-theme-bg\) 88%,\s*#ffffff 12%/);
});
