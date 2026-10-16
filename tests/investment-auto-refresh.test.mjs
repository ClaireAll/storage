import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../src/app/(pages)/home/investment/", import.meta.url);
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };

function harness({ hidden = false, fail = false, watchlist = [], fullWatchlist = watchlist, fetchElapsedMs = 0 } = {}) {
  const timers = new Map();
  let nextTimer = 0;
  let now = Date.parse("2026-10-15T02:12:00Z");
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const events = () => {
    const listeners = new Map();
    return {
      addEventListener(type, listener) { listeners.set(type, listener); },
      removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
      emit(type) { listeners.get(type)?.(); },
      listeners,
    };
  };
  const document = { ...events(), visibilityState: hidden ? "hidden" : "visible" };
  const navigator = { onLine: true };
  const window = events();
  const effects = [];
  const requests = [];
  const states = [];
  let stateIndex = 0;
  const refs = [];
  let refIndex = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect(effect) { effects.push(effect); },
    useRef(value) { return refs[refIndex++] ??= { current: value }; },
    useMemo(factory) { return factory(); },
    useCallback(callback) { return callback; },
  };
  const setTimer = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
  const clearTimer = id => timers.delete(id);
  const load = name => {
    const plainUrl = new URL(`${name}.ts`, root);
    const source = readFileSync(existsSync(plainUrl) ? plainUrl : new URL(`${name}.tsx`, root), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const loadedModule = { exports: {} };
    const localRequire = id => {
      if (id === "react") return hooks;
      if (id === "antd") return new Proxy({
        App: { useApp: () => ({ message: { success() {}, error() {} } }) },
        Typography: { Text: "Text", Title: "Title" }, Empty: { PRESENTED_IMAGE_SIMPLE: "empty" },
      }, { get: (target, key) => target[key] ?? String(key) });
      if (id === "@ant-design/icons") return new Proxy({}, { get: (_, key) => String(key) });
      if (id === "echarts") return {};
      if (id.startsWith("@/app/(pages)/common/")) return { CategoryIcon: "CategoryIcon", OverlayScrollArea: "OverlayScrollArea" };
      if (id === "../home-content-fullscreen") return { HomeContentFullscreenButton: "Fullscreen" };
      if (id === "@/lib/utils") return { cn: (...values) => values.filter(value => typeof value === "string").join(" ") };
      if (id.startsWith("./")) return load(id.slice(2));
      return require(id);
    };
    const fetcher = async (url, options) => {
      requests.push({ url, options });
      now += fetchElapsedMs;
      if (fail) throw new Error("offline");
      if (url.includes("mode=full")) return Response.json({ watchlist: fullWatchlist, recommended: [], evidence: [], sectors: [], quotesCheckedAt: "2026-10-15 10:12:00", marketState: "trading" });
      return Response.json({ quotes: [], quotesCheckedAt: "2026-10-15 10:12:00", marketState: "trading" });
    };
    Function("require", "module", "exports", "fetch", "window", "document", "navigator", "setTimeout", "clearTimeout", "Date", compiled)(
      localRequire, loadedModule, loadedModule.exports, fetcher, window, document, navigator, setTimer, clearTimer, Clock,
    );
    return loadedModule.exports;
  };
  const initialData = { watchlist, recommended: [], evidence: [], sectors: [], marketState: "trading", dataUpdatedAt: "2026-10-15 10:11:00", quotesCheckedAt: "2026-10-15 10:11:00" };
  const Dashboard = load("investment-dashboard").InvestmentDashboard;
  const render = () => { stateIndex = 0; refIndex = 0; return Dashboard({ initialData }); };
  const tree = render();
  const cleanups = effects.map(effect => effect()).filter(Boolean);
  return {
    requests, timers, document, window, navigator, states, initialData, tree, render,
    setFailure(value) { fail = value; },
    async tick() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id); now += timer.delay; timer.callback(); await settle();
    },
    cleanup() { cleanups.forEach(cleanup => cleanup()); },
  };
}

test("visible page refreshes immediately and every 15 seconds using the fast API", async () => {
  const app = harness();
  await settle();
  assert.equal(app.requests.length, 1);
  assert.match(app.requests[0].url, /mode=quotes/);
  assert.equal(app.requests[0].options.cache, "no-store");
  assert.equal(app.timers.size, 1);
  assert.equal([...app.timers.values()][0].delay, 15_000);
  await app.tick();
  assert.equal(app.requests.length, 2);
  app.cleanup();
  assert.equal(app.timers.size, 0);
  assert.equal(app.window.listeners.size, 0);
  assert.equal(app.document.listeners.size, 0);
});

test("slow responses count toward the 15-second cadence instead of adding another full polling interval", async () => {
  const app = harness({ fetchElapsedMs: 6_000 });
  await settle();
  assert.equal(app.requests.length, 1);
  assert.equal([...app.timers.values()][0].delay, 9_000);
  app.cleanup();
});

test("offline state visibly pauses automatic checks, preserves prices, and disables refresh until reconnected", async () => {
  const app = harness({ hidden: true, watchlist: focusRows });
  app.navigator.onLine = false;
  app.window.emit("offline");
  let tree = app.render();
  const notice = findElement(tree, element => element.props.role === "status");
  assert.ok(notice);
  assert.match(notice.props.children, /离线/);
  assert.equal(findElement(tree, element => element.props["aria-label"] === "手动刷新").props.disabled, true);
  assert.equal(app.states[0].watchlist[0].quote.price, 11);
  app.navigator.onLine = true;
  app.document.visibilityState = "visible";
  app.window.emit("online");
  await settle();
  tree = app.render();
  assert.equal(findElement(tree, element => element.props["aria-label"] === "手动刷新").props.disabled, false);
  assert.equal(app.requests.length, 1);
  app.cleanup();
});

function findElement(node, predicate) {
  if (Array.isArray(node)) return node.map(child => findElement(child, predicate)).find(Boolean);
  if (!React.isValidElement(node)) return undefined;
  return predicate(node) ? node : findElement(node.props.children, predicate);
}

const focusRows = ["stock", "fund"].map(instrumentType => ({
  id: instrumentType, instrumentName: instrumentType === "stock" ? "平安银行" : "华夏成长混合", instrumentCode: "000001", instrumentType,
  trend: [10, 11], trendLabels: ["10:10", "10:11"],
  quote: { kind: instrumentType === "stock" ? "stock" : "estimate", price: 11, changePercent: 1, source: "test", updatedAt: "2026-10-15 10:11:00", isLive: true },
  forecast: { label: "方向判断", value: "震荡" },
}));

test("selecting a row drives the detail, filtering falls back without losing the prior selection", () => {
  const app = harness({ hidden: true, watchlist: focusRows });
  const fund = findElement(app.tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "fund");
  const contents = fund.type(fund.props);
  findElement(contents, element => element.type === "button").props.onClick();
  let tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  findElement(tree, element => element.type === "Segmented").props.onChange("stock");
  tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "stock");
  findElement(tree, element => element.type === "Segmented").props.onChange("all");
  tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  app.cleanup();
});

test("quote refresh and keyboard reorder retain the selected record and send type-aware ordering", async () => {
  const app = harness({ hidden: true, watchlist: focusRows, fullWatchlist: [focusRows[0], {
    ...focusRows[1], quote: { ...focusRows[1].quote, price: 1.2034, updatedAt: "2026-10-15 10:12:00" },
  }] });
  const fund = findElement(app.tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "fund");
  fund.props.onSelect();
  let tree = app.render();
  findElement(tree, element => element.props["aria-label"] === "手动刷新").props.onClick();
  await settle();
  tree = app.render();
  const detail = findElement(tree, element => element.type.name === "InvestmentDetailPanel");
  assert.equal(detail.props.item.id, "fund");
  assert.equal(detail.props.item.quote.price, 1.2034);
  const row = findElement(tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "fund");
  const button = findElement(row.type(row.props), element => element.type === "button");
  button.props.onKeyDown({ altKey: true, key: "ArrowUp", preventDefault() {} });
  await settle();
  tree = app.render();
  assert.deepEqual(app.states[0].watchlist.map(item => item.id), ["fund", "stock"]);
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  const save = app.requests.find(request => request.options.method === "PUT");
  assert.deepEqual(JSON.parse(JSON.parse(save.options.body).instrument_order), ["fund:000001", "stock:000001"]);
  app.cleanup();
});

test("removing the selected record moves detail to the remaining entry and removing the last leaves it empty", async () => {
  const app = harness({ hidden: true, watchlist: focusRows });
  let tree = app.tree;
  let row = findElement(tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "stock");
  row.props.onRemove();
  await settle();
  tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  row = findElement(tree, element => element.type.name === "WatchlistRow");
  row.props.onRemove();
  await settle();
  tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item, undefined);
  assert.equal(app.states[0].watchlist.length, 0);
  app.cleanup();
});

test("a selection recovered after deletion stays pinned when the fallback record is reordered", async () => {
  const third = { ...focusRows[0], id: "third", instrumentCode: "000725", instrumentName: "京东方A" };
  const app = harness({ hidden: true, watchlist: [...focusRows, third] });
  findElement(app.tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "stock").props.onRemove();
  await settle();
  let tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  findElement(tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "fund").props.onMove(1);
  await settle();
  tree = app.render();
  assert.deepEqual(app.states[0].watchlist.map(item => item.id), ["third", "fund"]);
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "fund");
  app.cleanup();
});

test("an initially empty workspace pins the first new server record before subsequent reordering", async () => {
  const app = harness({ hidden: true, fullWatchlist: focusRows });
  findElement(app.tree, element => element.props["aria-label"] === "手动刷新").props.onClick();
  await settle();
  let tree = app.render();
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "stock");
  findElement(tree, element => element.type.name === "WatchlistRow" && element.props.item.id === "stock").props.onMove(1);
  await settle();
  tree = app.render();
  assert.deepEqual(app.states[0].watchlist.map(item => item.id), ["fund", "stock"]);
  assert.equal(findElement(tree, element => element.type.name === "InvestmentDetailPanel").props.item.id, "stock");
  app.cleanup();
});

test("hidden or offline page pauses and resumes immediately when usable", async () => {
  const app = harness({ hidden: true });
  await settle();
  assert.equal(app.requests.length, 0);
  app.document.visibilityState = "visible";
  app.document.emit("visibilitychange");
  await settle();
  assert.equal(app.requests.length, 1);
  app.navigator.onLine = false;
  app.window.emit("offline");
  assert.equal(app.timers.size, 0);
  app.navigator.onLine = true;
  app.window.emit("online");
  await settle();
  assert.equal(app.requests.length, 2);
  assert.equal(app.timers.size, 1);
  app.cleanup();
});

test("failed refresh preserves data and schedules a retry", async () => {
  const app = harness({ fail: true });
  await settle();
  assert.equal(app.states[0], app.initialData);
  assert.equal(app.timers.size, 1);
  app.setFailure(false);
  await app.tick();
  assert.equal(app.requests.length, 2);
  assert.equal(app.states[0].quotesCheckedAt, "2026-10-15 10:12:00");
  app.cleanup();
});

test("focus events do not overlap requests and hiding cancels pending work", async () => {
  const app = harness();
  app.window.emit("focus");
  app.window.emit("focus");
  assert.equal(app.requests.length, 1);
  app.document.visibilityState = "hidden";
  app.document.emit("visibilitychange");
  assert.equal(app.requests[0].options.signal.aborted, true);
  await settle();
  assert.equal(app.timers.size, 0);
  app.cleanup();
});

test("full signals refresh occurs every five minutes without slowing all quote checks", async () => {
  const app = harness();
  await settle();
  for (let i = 0; i < 21; i++) await app.tick();
  assert.equal(app.requests.filter(request => request.url.includes("mode=full")).length, 1);
  assert.equal(app.requests.filter(request => request.url.includes("mode=quotes")).length, 21);
  app.cleanup();
});

test("stock row exposes a readable stock badge, prominent change and full source timestamp", () => {
  function find(node, predicate) {
    if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
    if (!React.isValidElement(node)) return undefined;
    return predicate(node) ? node : find(node.props.children, predicate);
  }
  const app = harness({ hidden: true, watchlist: [{
    id: "stock", instrumentName: "深南电路", instrumentCode: "002916", instrumentType: "stock", trend: [],
    quote: { kind: "stock", changePercent: -1.25, source: "腾讯财经公开行情", updatedAt: "2026-10-15 10:11:48", isLive: true },
    forecast: { label: "方向判断", value: "偏弱" },
  }] });
  const row = find(app.tree, element => element.type.name === "WatchlistRow");
  const contents = row.type(row.props);
  const badge = find(contents, element => element.type === "Tag");
  assert.equal(badge.props.children, "股票");
  const value = find(contents, element => element.props.children === "-1.25%");
  assert.match(value.props.className, /text-lg/);
  const time = find(contents, element => element.type === "time");
  assert.equal(time.props.children, "2026-10-15 10:11:48");
  assert.equal(time.props.dateTime, "2026-10-15T10:11:48+08:00");
  assert.ok(find(contents, element => element.props.title === "腾讯财经公开行情"));
  const select = find(contents, element => element.type === "button");
  assert.equal(select.props["aria-pressed"], true);
  const offsets = [];
  const actions = row.type({ ...row.props, onMove: offset => offsets.push(offset) });
  const keyboardButton = find(actions, element => element.type === "button");
  let prevented = 0;
  keyboardButton.props.onKeyDown({ altKey: true, key: "ArrowDown", preventDefault: () => prevented++ });
  keyboardButton.props.onKeyDown({ altKey: true, key: "ArrowUp", preventDefault: () => prevented++ });
  assert.deepEqual(offsets, [1, -1]);
  assert.equal(prevented, 2);
  app.cleanup();
});
