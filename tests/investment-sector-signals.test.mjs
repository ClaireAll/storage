import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../src/app/(pages)/home/investment/", import.meta.url);
function load(name, overrides = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`${name}.ts`, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mod = { exports: {} };
  Function("require", "module", "exports", "fetch", "Date", outputText)(
    id => overrides.modules?.[id] ?? (id === "server-only" ? {} : id.startsWith("./") ? load(id.slice(2), overrides) : require(id)),
    mod, mod.exports, overrides.fetch ?? fetch, overrides.Date ?? Date,
  );
  return mod.exports;
}

const utils = load("investment-utils");
const now = new Date("2026-10-15T02:12:00Z");
const timestamp = Date.parse("2026-10-15T02:11:00Z") / 1000;
const payload = { data: { diff: [{ f12: "BK0475", f14: "银行", f3: 0, f124: timestamp }] } };

test("an unavailable sector never claims a sideways market or produces a forecast", () => {
  const rows = utils.getFallbackSectorSignals();
  assert.ok(rows.length);
  assert.ok(rows.every(row => row.changePercent === null && row.direction === "待判断" && row.forecastPercent === undefined && !row.isLive));
});

test("sector parsing preserves real zero and rejects nonfinite data and unverified timestamps", () => {
  const [row] = utils.parseEastmoneySectorSignals(payload, now);
  assert.equal(row.changePercent, 0);
  assert.equal(row.direction, "震荡");
  assert.equal(row.isLive, true);
  for (const f3 of [NaN, Infinity, "--", null, ""]) {
    const [invalid] = utils.parseEastmoneySectorSignals({ data: { diff: [{ f14: "银行", f3, f124: timestamp }] } }, now);
    assert.equal(invalid.changePercent, null);
    assert.equal(invalid.direction, "待判断");
    assert.equal(invalid.isLive, false);
  }
  for (const f124 of [undefined, timestamp - 86400, timestamp - 900, timestamp + 600]) {
    const [invalid] = utils.parseEastmoneySectorSignals({ data: { diff: [{ f14: "银行", f3: 2, f124 }] } }, now);
    assert.equal(invalid.isLive, false);
    assert.equal(invalid.direction, "待判断");
    assert.equal(invalid.forecastPercent, undefined);
    assert.match(invalid.reason, /未生成方向判断/);
  }
  const [objectRow] = utils.parseEastmoneySectorSignals({ data: { diff: { 0: payload.data.diff[0] } } }, now);
  assert.equal(objectRow.name, "银行");
  assert.equal(objectRow.changePercent, 0);
  assert.deepEqual(utils.parseEastmoneySectorSignals({ data: { diff: [{ f3: 8, f124: timestamp }] } }, now), []);
});

test("Sina fallback uses its actual industry names and percentage column without inventing source times", () => {
  assert.equal(typeof utils.parseSinaSectorSignals, "function");
  const rows = utils.parseSinaSectorSignals('var S_Finance_bankuai_sinaindustry = {"new_jrhy":"new_jrhy,金融行业,45,18.25,-0.11,-0.59,100,200,sh600000,1,2,3,浦发银行","new_gthy":"new_gthy,钢铁行业,60,6.14,0,0,100,200,sh600019,1,2,3,宝钢股份"};');
  assert.deepEqual(rows.map(row => [row.name, row.changePercent]), [["钢铁行业", 0], ["金融行业", -0.59]]);
  assert.ok(rows.every(row => row.updatedAt === null && !row.isLive && row.direction === "待判断" && row.forecastPercent === undefined));
  assert.equal(rows[0].source, "新浪财经行业板块（备用）");
  for (const text of ['<html>error</html>', 'var S_Finance_bankuai_sinaindustry = {}; throw new Error("must not execute");', 'var S_Finance_bankuai_sinaindustry = {"bad":"bad,行业,1,2,3,Infinity"}']) {
    assert.deepEqual(utils.parseSinaSectorSignals(text), []);
  }
});

test("sector state distinguishes verified live data, delayed data, unknown times and retained failures", () => {
  assert.equal(typeof utils.getInvestmentSectorState, "function");
  const row = { name: "银行", changePercent: 2, updatedAt: "2026-10-15 10:11:00" };
  assert.deepEqual(utils.getInvestmentSectorState(row, now), { label: "盘中行情", direction: "偏涨" });
  assert.deepEqual(utils.getInvestmentSectorState({ ...row, updatedAt: null }, now), { label: "时间未核实", direction: "待判断" });
  assert.deepEqual(utils.getInvestmentSectorState({ ...row, updatedAt: "2026-10-14 15:00:00" }, now), { label: "历史行情", direction: "待判断" });
  assert.deepEqual(utils.getInvestmentSectorState({ ...row, updatedAt: "2026-10-15 10:00:00" }, now), { label: "行情延迟", direction: "待判断" });
  assert.deepEqual(utils.getInvestmentSectorState({ ...row, refreshFailed: true }, now), { label: "更新失败 · 保留上次行情", direction: "待判断" });
  assert.deepEqual(utils.getInvestmentSectorState({ ...row, updatedAt: "2026-10-15 15:00:00" }, new Date("2026-10-15T07:40:00Z")), { label: "最近行情", direction: "偏涨" });
});

test("full refresh retains the last successful sector values and source times on a total outage", () => {
  const row = { name: "金融行业", changePercent: 1.25, updatedAt: "2026-10-15 10:11:00", source: "test", direction: "偏涨", isLive: true, forecastPercent: 0.5, reason: "当日强势", trend: [] };
  const current = { watchlist: [], recommended: [], sectors: [row] };
  const merged = utils.mergeInvestmentDashboard(current, { ...current, sectors: utils.getFallbackSectorSignals() });
  assert.equal(merged.sectors.length, 1);
  assert.equal(merged.sectors[0].changePercent, 1.25);
  assert.equal(merged.sectors[0].updatedAt, "2026-10-15 10:11:00");
  assert.equal(merged.sectors[0].refreshFailed, true);
  assert.equal(merged.sectors[0].isLive, false);
  assert.equal(merged.sectors[0].direction, "待判断");
  assert.equal(merged.sectors[0].forecastPercent, undefined);
  assert.match(merged.sectors[0].reason, /未生成方向判断/);
});

test("a partial sector refresh preserves only the failing row and does not overwrite newer timestamps", () => {
  assert.equal(typeof utils.mergeInvestmentSectorSignals, "function");
  const previous = [
    { name: "银行", source: "test", changePercent: 1, updatedAt: "2026-10-15 10:11:00" },
    { name: "软件", source: "test", changePercent: 2, updatedAt: "2026-10-15 10:11:00" },
  ];
  const result = utils.mergeInvestmentSectorSignals(previous, [
    { ...previous[0], changePercent: null },
    { ...previous[1], changePercent: 3, updatedAt: "2026-10-15 10:12:00" },
  ]);
  assert.deepEqual(result.map(row => row.changePercent), [1, 3]);
  assert.equal(result[0].refreshFailed, true);
  assert.equal(result[1].refreshFailed, undefined);
  const older = utils.mergeInvestmentSectorSignals(previous, [{ ...previous[0], changePercent: 4, updatedAt: "2026-10-14 15:00:00" }]);
  assert.equal(older[0].changePercent, 1);
});

function dashboardWithSectorFetch(fetcher) {
  return load("investment-data", {
    modules: {
      "@/app/utils/database": { listInvestmentWatchlist: async () => ({ data: [], error: null }) },
      "./investment-quotes": { getInvestmentQuotes: async () => [] },
      "./investment-notifications": { dispatchInvestmentNotifications: async () => {} },
    },
    fetch: (url, options) => String(url).includes("clist/get") || String(url).includes("newSinaHy.php")
      ? fetcher(String(url), options) : Promise.resolve(new Response("公开资讯", { status: 200 })),
  });
}

const sinaBody = Buffer.concat([
  Buffer.from('var S_Finance_bankuai_sinaindustry = {"new_jrhy":"new_jrhy,'),
  Buffer.from([0xd2, 0xf8, 0xd0, 0xd0]),
  Buffer.from(',45,18.25,-0.11,-0.59,100,200,sh600000,1,2,3,test"};'),
]);

test("dashboard uses the GBK-decoded Sina fallback for failed, non-OK, empty or malformed primary responses", async () => {
  const failures = [
    () => { throw new TypeError("other side closed"); },
    () => new Response("unavailable", { status: 503 }),
    () => Response.json({ data: { diff: [] } }),
    () => new Response("not JSON"),
  ];
  for (const fail of failures) {
    const dashboard = dashboardWithSectorFetch(async (url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return url.includes("clist/get") ? fail() : new Response(sinaBody, { headers: { "Content-Type": "text/html; charset=gbk" } });
    });
    const result = await dashboard.listInvestmentDashboard({}, "user-a");
    assert.equal(result.sectors.length, 1);
    assert.equal(result.sectors[0].name, "银行");
    assert.equal(result.sectors[0].changePercent, -0.59);
    assert.equal(result.sectors[0].updatedAt, null);
    assert.ok(result.recommended.every(row => row.forecast === "--"));
  }
});

test("successful primary data does not request the fallback; server memory retains values on outage and recovers", async () => {
  let mode = "success";
  const dashboard = dashboardWithSectorFetch(async url => {
    if (mode === "outage") throw new TypeError("offline");
    assert.ok(url.includes("clist/get"), "a valid primary response must not request the fallback");
    return Response.json({ data: { diff: [{ f14: "银行", f3: mode === "success" ? 0 : 2, f124: 1_700_000_000 }] } });
  });
  const first = await dashboard.listInvestmentDashboard({}, "user-a");
  mode = "outage";
  const failed = await dashboard.listInvestmentDashboard({}, "user-b");
  assert.equal(failed.sectors[0].changePercent, 0);
  assert.equal(failed.sectors[0].updatedAt, "2023-11-15 06:13:20");
  assert.equal(failed.sectors[0].refreshFailed, true);
  assert.equal(failed.sectors[0].direction, "待判断");
  assert.equal(first.sectors[0].refreshFailed, undefined);
  mode = "recovered";
  const recovered = await dashboard.listInvestmentDashboard({}, "user-a");
  assert.equal(recovered.sectors[0].changePercent, 2);
  assert.equal(recovered.sectors[0].refreshFailed, undefined);
});

test("unverified, retained and delayed sector values do not send directional notifications", async () => {
  const messages = [];
  const updates = [];
  const query = {
    select() { return this; }, eq() { return this; },
    update(value) { updates.push(value); return this; },
    maybeSingle: async () => ({ data: { enabled: true, notify_on_signal: true, notify_on_recommendation: false, webhook_url: "https://example.invalid/webhook" } }),
  };
  const notifications = load("investment-notifications", {
    Date: class extends Date {
      constructor(value = now) { super(value); }
    },
    modules: { "@/utils/supabase/admin": { createAdminClient: () => ({ from: () => query }) } },
    fetch: async (_url, options) => { messages.push(options.body); return new Response("ok"); },
  });
  const sector = { name: "银行", direction: "待判断", changePercent: 2, updatedAt: null };
  await notifications.dispatchInvestmentNotifications("user-a", [], [
    sector, { ...sector, direction: "偏涨", refreshFailed: true },
    { ...sector, direction: "偏涨", updatedAt: "2023-11-15 15:00:00" },
  ]);
  assert.equal(messages.length, 0);
  await notifications.dispatchInvestmentNotifications("user-a", [], [
    sector, { ...sector, updatedAt: "2026-10-15 10:11:00", direction: "偏涨" },
  ]);
  assert.equal(messages.length, 1);
  assert.equal(updates.length, 1);
  assert.match(JSON.parse(messages[0]).markdown.content, /银行：偏涨/);
  assert.doesNotMatch(JSON.parse(messages[0]).markdown.content, /待判断/);
});
