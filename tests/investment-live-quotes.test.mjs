import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../src/app/(pages)/home/investment/", import.meta.url);
function loadModule(name, overrides = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`${name}.ts`, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loadedModule = { exports: {} };
  const localRequire = (id) => overrides.modules?.[id] ?? (id === "server-only" ? {} : id.startsWith("./")
    ? loadModule(id.slice(2), overrides) : require(id));
  Function("require", "module", "exports", "fetch", outputText)(localRequire, loadedModule, loadedModule.exports, overrides.fetch ?? fetch);
  return loadedModule.exports;
}

const utils = loadModule("investment-utils");
const duringTrading = new Date("2026-10-15T02:12:00Z");

test("fund valuations accept real zero but never convert missing values to zero", () => {
  assert.equal(typeof utils.parseFundValuation, "function");
  const quote = utils.parseFundValuation({ GSZZL: "0.00", GZTIME: "2026-10-15 10:11" }, duringTrading);
  assert.equal(quote.changePercent, 0);
  assert.equal(quote.kind, "estimate");
  assert.equal(quote.isLive, true);
  for (const value of [null, undefined, "", " ", "--", "NaN"]) {
    assert.equal(utils.parseFundValuation({ GSZZL: value, GZTIME: "2026-10-15 10:11" }, duringTrading).changePercent, null);
  }
});

test("old or missing quote timestamps cannot be presented as live", () => {
  assert.equal(typeof utils.parseFundValuation, "function");
  assert.equal(utils.parseFundValuation({ GSZZL: 1.2, GZTIME: "2026-10-14 15:00" }, duringTrading).isLive, false);
  assert.equal(utils.parseFundValuation({ GSZZL: 1.2 }, duringTrading).isLive, false);
  const stock = utils.parseEastmoneyStockQuote({ data: { f170: 125, f124: 1792029600 } }, duringTrading);
  assert.equal(stock.changePercent, 1.25);
  assert.equal(stock.isLive, false);
});

test("a published NAV supersedes an estimate for the same or an older trading day", () => {
  assert.equal(typeof utils.selectFundQuote, "function");
  const estimate = { kind: "estimate", changePercent: 1, updatedAt: "2026-10-14 15:00:00", isLive: false };
  const nav = { kind: "nav", changePercent: 1.2, updatedAt: "2026-10-14 00:00:00", isLive: false };
  assert.equal(utils.selectFundQuote(estimate, nav), nav);
  assert.equal(utils.selectFundQuote({ ...estimate, updatedAt: "2026-10-15 10:11:00" }, nav).kind, "estimate");
});

test("Tencent batches retain each code and second-level source timestamps", () => {
  assert.equal(typeof utils.parseTencentStockQuotes, "function");
  const payload = ["000001", "000725"].map((code, i) => {
    const values = Array(33).fill("");
    values[2] = code; values[30] = "20261015101148"; values[32] = i ? "-3.28" : "0.00";
    return `v_sz${code}="${values.join("~")}";`;
  }).join("\n");
  const quotes = utils.parseTencentStockQuotes(payload, duringTrading);
  assert.equal(quotes.get("000001").changePercent, 0);
  assert.equal(quotes.get("000725").changePercent, -3.28);
  assert.equal(quotes.get("000725").updatedAt, "2026-10-15 10:11:48");
  assert.equal(quotes.get("000725").isLive, true);
});

test("quote polling backs off outside market hours and checks NAV publication after close", () => {
  assert.equal(typeof utils.getInvestmentRefreshInterval, "function");
  assert.equal(utils.getInvestmentRefreshInterval(duringTrading), 15_000);
  assert.equal(utils.getInvestmentRefreshInterval(new Date("2026-10-15T12:00:00Z")), 60_000);
  assert.equal(utils.getInvestmentRefreshInterval(new Date("2026-10-17T02:00:00Z")), 300_000);
});

test("fund requests are batched and an unsupported valuation falls back to real NAV", async () => {
  const requested = [];
  const provider = loadModule("investment-quotes", { fetch: async (input) => {
    const url = String(input); requested.push(url);
    if (url.includes("FundValuationLast")) return Response.json({ success: true, data: [
      { FCODE: "008888", GSZZL: -3.16, GZTIME: "2026-10-15 10:11" },
      { FCODE: "110022", GSZZL: null, GZTIME: null },
    ] });
    if (url.includes("pingzhongdata/110022")) return new Response('var Data_netWorthTrend = [{"x":1791907200000,"y":2.762,"equityReturn":0.42}];');
    throw new Error(`unexpected request: ${url}`);
  } });
  const rows = await provider.getInvestmentQuotes([
    { instrumentType: "fund", instrumentCode: "008888" },
    { instrumentType: "fund", instrumentCode: "110022" },
    { instrumentType: "fund", instrumentCode: "008888" },
  ], { includeFundHistory: false, now: duringTrading });
  assert.equal(requested.filter(url => url.includes("FundValuationLast")).length, 1);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].quote.kind, "estimate");
  assert.equal(rows[0].quote.changePercent, -3.16);
  assert.equal(rows[1].quote.kind, "nav");
  assert.equal(rows[1].quote.changePercent, 0.42);
  assert.equal(rows[1].quote.isLive, false);
});

test("quote merge preserves current order, deleted items and last good data on partial failures", () => {
  const make = (code, value, time = "2026-10-15 10:11:00") => ({
    instrumentCode: code, instrumentType: "stock", trend: [1, 2],
    quote: { kind: "stock", changePercent: value, isLive: true, updatedAt: time, source: "source" },
  });
  const data = { watchlist: [make("000725", -1), make("000001", 0)], recommended: [], sectors: [{ name: "原板块" }] };
  const next = utils.mergeInvestmentQuotes(data, { quotesCheckedAt: "2026-10-15 10:12:00", marketState: "trading", quotes: [
    make("000001", 2), make("000021", 1), make("000725", null),
  ] });
  assert.deepEqual(next.watchlist.map(item => item.instrumentCode), ["000725", "000001"]);
  assert.equal(next.watchlist[0].quote.changePercent, -1);
  assert.equal(next.watchlist[0].quote.refreshFailed, true);
  assert.equal(next.watchlist[0].quote.isLive, false);
  assert.equal(next.watchlist[1].quote.changePercent, 2);
  assert.deepEqual(next.sectors, [{ name: "原板块" }]);
  const older = utils.mergeInvestmentQuotes(next, { quotes: [make("000001", 4, "2026-10-14 15:00:00")] });
  assert.equal(older.watchlist[1].quote.changePercent, 2);
});

test("provider switches fund domains on failure and never requests the retired JSONP endpoint", async () => {
  const requested = [];
  const provider = loadModule("investment-quotes", { fetch: async input => {
    const url = String(input); requested.push(url);
    if (url.includes("tiantianfunds")) throw new Error("network down");
    if (url.includes("FundValuationLast")) return Response.json({ data: [{ FCODE: "008888", GSZZL: 0, GZTIME: "2026-10-15 10:11" }] });
    throw new Error(`unexpected request ${url}`);
  } });
  const [row] = await provider.getInvestmentQuotes([{ instrumentType: "fund", instrumentCode: "008888" }], { now: duringTrading, includeFundHistory: false });
  assert.equal(row.quote.changePercent, 0);
  assert.equal(row.quote.isLive, true);
  assert.equal(requested.length, 2);
  assert.equal(requested.some(url => url.includes("fundgz")), false);
});

test("full refresh keeps good quotes on partial failure but respects portfolio membership", () => {
  const quote = { kind: "stock", changePercent: 1, updatedAt: "2026-10-15 10:11:00", isLive: true };
  const oldItem = { instrumentType: "stock", instrumentCode: "000725", quote, trend: [1, 2] };
  const current = { watchlist: [oldItem, { ...oldItem, instrumentCode: "000001" }], recommended: [] };
  const next = { watchlist: [{ ...oldItem, quote: utils.unavailableInvestmentQuote(), trend: [] }], recommended: [], sectors: ["new signal"] };
  const merged = utils.mergeInvestmentDashboard(current, next);
  assert.equal(merged.watchlist.length, 1);
  assert.equal(merged.watchlist[0].quote.changePercent, 1);
  assert.equal(merged.watchlist[0].quote.refreshFailed, true);
  assert.deepEqual(merged.watchlist[0].trend, [1, 2]);
  assert.deepEqual(merged.sectors, ["new signal"]);
});

test("fast snapshot only loads this user's watchlist and quotes, without news or notifications", async () => {
  const users = [];
  const data = loadModule("investment-data", { modules: {
    "@/app/utils/database": { listInvestmentWatchlist: async (_db, userId) => {
      users.push(userId);
      return { data: [{ instrumentType: "fund", instrumentCode: "008888" }], error: null };
    } },
    "./investment-notifications": { dispatchInvestmentNotifications: () => { throw new Error("fast refresh must not notify"); } },
    "./investment-quotes": { getInvestmentQuotes: async instruments => instruments.map(item => ({
      ...item, quote: { kind: "estimate", changePercent: 0, updatedAt: "2026-10-15 10:11", isLive: true },
    })) },
  }, fetch: () => { throw new Error("fast refresh must not fetch news"); } });
  const snapshot = await data.listInvestmentQuoteSnapshot({}, "user-a");
  assert.deepEqual(users, ["user-a"]);
  assert.equal(snapshot.quotes[0].instrumentCode, "008888");
  assert.equal(typeof snapshot.quotesCheckedAt, "string");
  assert.equal("evidence" in snapshot, false);
});

test("sector API with fltt=2 retains percentage units", () => {
  const [sector] = utils.parseEastmoneySectorSignals({ data: { diff: [{ f14: "半导体", f3: 2.35, f124: 1792029600 }] } });
  assert.equal(sector.changePercent, 2.35);
});

test("fast quote API requires authentication and only reads the authenticated user's portfolio", async () => {
  let session = null;
  const users = [];
  const api = loadModule("../../../api/investment/dashboard/route", { modules: {
    "../../../../../auth": { auth: async () => session },
    "@/utils/supabase/admin": { createAdminClient: () => ({}) },
    "@/app/(pages)/home/investment/investment-data": {
      listInvestmentQuoteSnapshot: async (_client, userId) => { users.push(userId); return { quotes: [] }; },
      listInvestmentDashboard: () => { throw new Error("fast API must not load the full dashboard"); },
    },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  } });
  const request = new Request("http://localhost/api/investment/dashboard?mode=quotes");
  assert.equal((await api.GET(request)).status, 401);
  assert.deepEqual(users, []);
  session = { user: { id: "user-a" } };
  const response = await api.GET(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { quotes: [] });
  assert.deepEqual(users, ["user-a"]);
});

test("legacy Shennan Circuits fund rows request stock quotes on the next refresh", async () => {
  const requested = [];
  const data = loadModule("investment-data", {
    modules: {
      "@/app/utils/database": { listInvestmentWatchlist: async () => ({ error: null, data: [
        { id: "legacy", instrumentCode: "002916", instrumentName: "深南电路", instrumentType: "fund", instrumentOrder: null },
      ] }) },
      "./investment-quotes": { getInvestmentQuotes: async instruments => {
        requested.push(...instruments);
        return [];
      } },
      "./investment-notifications": {},
    },
    fetch: async () => Response.json({ Datas: [{ CODE: "002916", NAME: "深南电路", CATEGORY: 150, STOCKMARKET: "2", FundBaseInfo: null }] }),
  });
  const snapshot = await data.listInvestmentQuoteSnapshot({}, "user-a");
  assert.equal(snapshot.instruments[0].instrumentType, "stock");
  assert.equal(requested[0].instrumentType, "stock");
  assert.equal(requested[0].instrumentName, "深南电路");
});

test("a type correction removes old fund NAV, trend and forecast before applying stock data", () => {
  const legacy = {
    id: "legacy", instrumentCode: "002916", instrumentName: "深南电路", instrumentType: "fund", trend: [1, 1],
    quote: { kind: "nav", changePercent: 0, updatedAt: "2026-06-30 00:00:00", isLive: false },
    forecast: { value: "+0.50%" },
  };
  const data = { watchlist: [legacy], recommended: [] };
  const merged = utils.mergeInvestmentQuotes(data, {
    instruments: [{ id: "legacy", instrumentCode: "002916", instrumentName: "深南电路", instrumentType: "stock" }],
    quotes: [{ instrumentCode: "002916", instrumentType: "stock", quote: { kind: "stock", changePercent: -1.25, updatedAt: "2026-10-15 10:11:00", isLive: true }, trend: [150, 148] }],
  });
  assert.equal(merged.watchlist[0].instrumentType, "stock");
  assert.equal(merged.watchlist[0].quote.kind, "stock");
  assert.equal(merged.watchlist[0].quote.changePercent, -1.25);
  assert.deepEqual(merged.watchlist[0].trend, [150, 148]);
  assert.equal(merged.watchlist[0].forecast.value, "--");
});

test("adding a watch item saves the verified type instead of trusting the submitted type", async () => {
  let inserted;
  const query = {
    select() { return this; }, eq() { return this; },
    returns: async () => ({ data: [], error: null }),
    insert(value) { inserted = value; return this; },
    single: async () => ({ data: inserted, error: null }),
  };
  const api = loadModule("../../../api/investment/route", { modules: {
    "../../../../auth": { auth: async () => ({ user: { id: "user-a" } }) },
    "@/utils/supabase/admin": { createAdminClient: () => ({ from: () => query }) },
    "@/app/(pages)/home/investment/investment-data": { resolveInvestmentInstrument: async () => ({ instrumentCode: "002916", instrumentName: "深南电路", instrumentType: "stock" }) },
    "@/app/(pages)/home/investment/investment-search-utils": loadModule("investment-search-utils"),
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  } });
  const response = await api.POST(new Request("http://localhost/api/investment", { method: "POST", body: JSON.stringify({ instrument_code: "002916", instrument_name: "深南电路", instrument_type: "fund" }) }));
  assert.equal(response.status, 200);
  assert.equal(inserted.instrument_type, "stock");
  assert.equal(inserted.user_id, "user-a");
});

test("legacy wrong-type holdings cannot be added a second time under the corrected type", async () => {
  const query = {
    select() { return this; }, eq() { return this; },
    returns: async () => ({ data: [{ id: "legacy", instrument_name: "深南电路", instrument_type: "fund" }], error: null }),
    insert() { throw new Error("must not create a duplicate legacy holding"); },
  };
  const api = loadModule("../../../api/investment/route", { modules: {
    "../../../../auth": { auth: async () => ({ user: { id: "user-a" } }) },
    "@/utils/supabase/admin": { createAdminClient: () => ({ from: () => query }) },
    "@/app/(pages)/home/investment/investment-data": { resolveInvestmentInstrument: async () => ({ instrumentCode: "002916", instrumentName: "深南电路", instrumentType: "stock" }) },
    "@/app/(pages)/home/investment/investment-search-utils": loadModule("investment-search-utils"),
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  } });
  const response = await api.POST(new Request("http://localhost/api/investment", { method: "POST", body: JSON.stringify({ instrument_code: "002916", instrument_name: "深南电路", instrument_type: "stock" }) }));
  assert.equal(response.status, 409);
});
