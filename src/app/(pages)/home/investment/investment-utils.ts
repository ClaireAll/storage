import type {
  InvestmentMarketState,
  InvestmentQuote,
  InvestmentDashboardData,
  InvestmentQuoteSnapshot,
  InvestmentSectorSignal,
  InvestmentWatchlistEntry,
} from "./investment-types";
import type { EChartsOption } from "echarts";

const chinaTimezoneOffset = 8 * 60 * 60 * 1000;

const closedDates2026 = new Set([
  "2026-01-01", "2026-01-02", "2026-01-03", "2026-02-15", "2026-02-16",
  "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21",
  "2026-02-22", "2026-02-23", "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
  "2026-06-19", "2026-06-20", "2026-06-21", "2026-09-25", "2026-09-26",
  "2026-09-27", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
  "2026-10-05", "2026-10-06", "2026-10-07",
]);

const fallbackSectorNames = ["半导体", "光伏", "软件服务", "新能源汽车", "创新药", "银行"];

/** 根据上交所公布的交易日和中国交易时段返回展示状态。 */
export function getInvestmentMarketState(
  now = new Date(),
): { state: InvestmentMarketState; label: string } {
  const chinaTime = new Date(now.getTime() + chinaTimezoneOffset);
  const weekday = chinaTime.getUTCDay();
  const date = chinaTime.toISOString().slice(0, 10);
  const minutes = chinaTime.getUTCHours() * 60 + chinaTime.getUTCMinutes();

  if (weekday === 0 || weekday === 6 || closedDates2026.has(date)) {
    return { label: "休市", state: "non-trading" };
  }

  if (minutes < 9 * 60 + 30) {
    return { label: "开盘前", state: "pre-open" };
  }

  if (minutes < 11 * 60 + 30) {
    return { label: "盘中 · 行情自动更新", state: "trading" };
  }

  if (minutes < 13 * 60) {
    return { label: "午间休市", state: "lunch-break" };
  }

  if (minutes < 15 * 60) {
    return { label: "盘中 · 行情自动更新", state: "trading" };
  }

  return { label: "已收盘", state: "after-close" };
}

/** 为无法访问的行情返回明确的不可用状态。 */
export function unavailableInvestmentQuote(source = "公开行情接口"): InvestmentQuote {
  return { price: null, changePercent: null, kind: "unavailable", isLive: false, source, updatedAt: null };
}

export function formatInvestmentTime(date = new Date()) {
  return new Date(date.getTime() + chinaTimezoneOffset).toISOString().slice(0, 19).replace("T", " ");
}

function quoteTime(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value)) return NaN;
  return Date.parse(`${value.replace(" ", "T")}+08:00`);
}

function isFreshQuote(updatedAt: string | null, now: Date, maxAge = 300_000) {
  const age = now.getTime() - quoteTime(updatedAt);
  return getInvestmentMarketState(now).state === "trading" && age >= -60_000 && age <= maxAge;
}

function quoteNumber(value: unknown): number | null {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** 新估值接口的缺失值不应转成 0%，也不应被标为实时。 */
export function parseFundValuation(data: Record<string, unknown>, now = new Date()): InvestmentQuote {
  const changePercent = quoteNumber(data.GSZZL);
  const updatedAt = typeof data.GZTIME === "string" && Number.isFinite(quoteTime(data.GZTIME)) ? data.GZTIME : null;
  return {
    price: quoteNumber(data.GSZ),
    changePercent,
    kind: "estimate",
    isLive: changePercent !== null && isFreshQuote(updatedAt, now),
    source: "天天基金盘中估值",
    updatedAt,
  };
}

export function parseTencentStockQuotes(payload: string, now = new Date()) {
  const quotes = new Map<string, InvestmentQuote>();
  for (const match of payload.matchAll(/v_sz(\d{6})="([^"\n]*)";/g)) {
    const fields = match[2].split("~");
    const changePercent = quoteNumber(fields[32]);
    const timestamp = fields[30]?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    const updatedAt = timestamp ? `${timestamp[1]}-${timestamp[2]}-${timestamp[3]} ${timestamp[4]}:${timestamp[5]}:${timestamp[6]}` : null;
    if (fields[2] !== match[1] || changePercent === null) continue;
    quotes.set(match[1], { price: quoteNumber(fields[3]), changePercent, kind: "stock", isLive: isFreshQuote(updatedAt, now, 90_000), source: "腾讯财经公开行情", updatedAt });
  }
  return quotes;
}

export function selectFundQuote(estimate: InvestmentQuote, nav: InvestmentQuote) {
  if (estimate.changePercent === null || !estimate.updatedAt) return nav;
  if (nav.changePercent !== null && nav.updatedAt && nav.updatedAt.slice(0, 10) >= estimate.updatedAt.slice(0, 10)) return nav;
  return estimate;
}

export function getInvestmentQuoteLabel(quote: InvestmentQuote, now = new Date()) {
  if (quote.refreshFailed) return "更新失败 · 保留上次行情";
  if (quote.changePercent === null) return "行情暂不可用";
  if (quote.kind === "nav") return "已公布净值";
  const trading = getInvestmentMarketState(now).state === "trading";
  const fresh = quote.isLive && isFreshQuote(quote.updatedAt, now, quote.kind === "stock" ? 90_000 : 300_000);
  if (quote.kind === "estimate") return fresh ? "盘中估值" : trading ? "估值延迟" : "最近盘中估值";
  return fresh ? "盘中行情" : trading ? "行情延迟" : "最近交易行情";
}

export function getInvestmentRefreshInterval(now = new Date()) {
  const state = getInvestmentMarketState(now).state;
  if (state === "trading") return 15_000;
  const hour = new Date(now.getTime() + chinaTimezoneOffset).getUTCHours();
  return state === "after-close" && hour < 23 ? 60_000 : 300_000;
}

/** 休市退避不能跨过下一次开盘；时间计算固定使用上海时区。 */
export function getInvestmentNextRefreshDelay(now = new Date()) {
  const interval = getInvestmentRefreshInterval(now);
  const state = getInvestmentMarketState(now).state;
  if (state !== "pre-open" && state !== "lunch-break") return interval;
  const chinaTime = new Date(now.getTime() + chinaTimezoneOffset);
  const opensAt = Date.UTC(chinaTime.getUTCFullYear(), chinaTime.getUTCMonth(), chinaTime.getUTCDate(), state === "pre-open" ? 9 : 13, state === "pre-open" ? 30 : 0) - chinaTimezoneOffset;
  return Math.max(1000, Math.min(interval, opensAt - now.getTime()));
}

/** 快照只更新当前记录的行情，不覆盖用户刚刚调整的关注顺序或恢复已删除记录。 */
export function mergeInvestmentQuotes(data: InvestmentDashboardData, snapshot: InvestmentQuoteSnapshot): InvestmentDashboardData {
  const byCode = new Map(snapshot.quotes.map(item => [`${item.instrumentType}:${item.instrumentCode}`, item]));
  const identities = new Map((snapshot.instruments ?? []).map(item => [item.id, item]));
  const merge = <T extends { instrumentType: string; instrumentCode: string; quote: InvestmentQuote }>(item: T) => {
    const update = byCode.get(`${item.instrumentType}:${item.instrumentCode}`);
    if (!update) return item;
    if (update.quote.changePercent === null && item.quote.changePercent !== null) {
      return { ...item, quote: { ...item.quote, isLive: false, refreshFailed: true } };
    }
    const currentTime = quoteTime(item.quote.updatedAt);
    const nextTime = quoteTime(update.quote.updatedAt);
    const publishedForSameDay = update.quote.kind === "nav" && item.quote.kind === "estimate" && update.quote.updatedAt?.slice(0, 10) === item.quote.updatedAt?.slice(0, 10);
    if (Number.isFinite(currentTime) && (!Number.isFinite(nextTime) || nextTime < currentTime) && !publishedForSameDay) return item;
    const quoteDate = update.quote.updatedAt?.slice(0, 10);
    const previousTrendDate = "trendDate" in item && typeof item.trendDate === "string" ? item.trendDate : item.quote.updatedAt?.slice(0, 10);
    const wrongTrendDay = item.instrumentType === "stock" && quoteDate &&
      (update.trend?.length ? update.trendDate && update.trendDate !== quoteDate : previousTrendDate !== quoteDate);
    return {
      ...item, quote: update.quote,
      ...(wrongTrendDay ? { trend: [], trendLabels: [], trendDate: undefined } : update.trend?.length
        ? { trend: update.trend, trendLabels: update.trendLabels ?? [], trendDate: update.trendDate } : {}),
    };
  };
  return {
    ...data,
    quotesCheckedAt: snapshot.quotesCheckedAt,
    marketState: snapshot.marketState,
    marketStateLabel: snapshot.marketStateLabel,
    watchlist: data.watchlist.map(item => {
      const identity = identities.get(item.id);
      if (!identity || identity.instrumentCode !== item.instrumentCode || identity.instrumentType === item.instrumentType) return merge(item);
      return merge({
        ...item, ...identity, quote: unavailableInvestmentQuote(), trend: [], trendLabels: [], trendDate: undefined,
        forecast: { label: "类型已纠正，等待信号更新", reason: "原预测不适用于当前品种。", source: "品种核验", value: "--" },
      });
    }),
    recommended: data.recommended.map(item => {
      const next = merge(item);
      return { ...next, changePercent: next.quote.changePercent, updatedAt: next.quote.updatedAt };
    }),
  };
}

/** 全量刷新仍保留单项失败前的有效行情，关注项增删以本次服务端结果为准。 */
export function mergeInvestmentDashboard(current: InvestmentDashboardData, incoming: InvestmentDashboardData) {
  const previous = new Map([...current.recommended, ...current.watchlist].map(item => [`${item.instrumentType}:${item.instrumentCode}`, item]));
  const keepPreviousQuote = <T extends { instrumentType: string; instrumentCode: string; quote: InvestmentQuote }>(item: T) => {
    const prior = previous.get(`${item.instrumentType}:${item.instrumentCode}`);
    return prior ? { ...item, quote: prior.quote, ...("trend" in prior ? { trend: prior.trend, trendLabels: "trendLabels" in prior ? prior.trendLabels : undefined, trendDate: "trendDate" in prior ? prior.trendDate : undefined } : {}) } : item;
  };
  return mergeInvestmentQuotes({
    ...incoming,
    sectors: mergeInvestmentSectorSignals(current.sectors ?? [], incoming.sectors ?? []),
    watchlist: incoming.watchlist.map(keepPreviousQuote),
    recommended: incoming.recommended.map(keepPreviousQuote),
  }, { ...incoming, quotes: [...incoming.recommended, ...incoming.watchlist] });
}

/** 解析东方财富股票即时字段，涨跌幅字段的单位为万分之一。 */
export function parseEastmoneyStockQuote(payload: unknown, now = new Date()): InvestmentQuote {
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: Record<string, unknown> }).data
      : undefined;
  const changePercent = data?.f170;
  const timestamp = data?.f124;
  const updatedAt = typeof timestamp === "number" && timestamp > 0 ? formatInvestmentTime(new Date(timestamp * 1000)) : null;
  const rawPrice = quoteNumber(data?.f43);
  const decimals = data?.f59;

  return {
    price: rawPrice !== null && typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0 && decimals <= 6
      ? rawPrice / 10 ** decimals : null,
    changePercent:
      typeof changePercent === "number" && Number.isFinite(changePercent) ? Number((changePercent / 100).toFixed(2)) : null,
    kind: "stock",
    isLive: typeof changePercent === "number" && Number.isFinite(changePercent) && isFreshQuote(updatedAt, now, 90_000),
    source: "东方财富公开行情",
    updatedAt,
  };
}

/** 选中项只跟随记录 ID；筛选隐藏或移除时回退到第一个可见项。 */
export function getSelectedInvestmentEntry(items: InvestmentWatchlistEntry[], filter: "all" | "fund" | "stock", selectedId?: string) {
  const visible = items.filter(item => filter === "all" || item.instrumentType === filter);
  return visible.find(item => item.id === selectedId) ?? visible[0];
}

/** 每个筛选记住自己的有效选中项，回退后排序也不会改变详情。 */
export function resolveInvestmentSelection(items: InvestmentWatchlistEntry[], selected: Partial<Record<"all" | "stock" | "fund", string>>) {
  return {
    all: getSelectedInvestmentEntry(items, "all", selected.all)?.id,
    stock: getSelectedInvestmentEntry(items, "stock", selected.stock)?.id,
    fund: getSelectedInvestmentEntry(items, "fund", selected.fund)?.id,
  };
}

export function formatInvestmentPrice(quote: InvestmentQuote, instrumentType: "fund" | "stock") {
  if (quote.kind === "unavailable" || typeof quote.price !== "number" || !Number.isFinite(quote.price) || quote.price <= 0) return "--";
  return quote.price.toFixed(instrumentType === "fund" ? 4 : 2);
}

/** 只使用来源采样，不补造分时价格或百分比坐标。 */
export function buildInvestmentChartOptions(
  trend: number[],
  trendLabels: string[],
  colors: { text: string; grid: string; background: string; line: string },
  instrumentType: "fund" | "stock" = "stock",
): EChartsOption {
  return {
    animation: false,
    grid: { top: 24, right: 24, bottom: 34, left: 12, containLabel: true },
    tooltip: { trigger: "axis", confine: true, backgroundColor: colors.background, borderColor: colors.grid, textStyle: { color: colors.text } },
    xAxis: {
      type: "category", boundaryGap: false,
      data: trendLabels.length === trend.length ? trendLabels : trend.map((_, index) => String(index + 1)),
      axisLine: { lineStyle: { color: colors.grid } }, axisTick: { show: false },
      axisLabel: { color: colors.text, fontSize: 12, hideOverlap: true },
    },
    yAxis: {
      type: "value", scale: true, splitNumber: 4,
      axisLabel: { color: colors.text, fontSize: 12, formatter: (value: number) => value.toFixed(instrumentType === "fund" ? 4 : 2) },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    series: [{
      type: "line", data: trend.map(value => Number.isFinite(value) && value > 0 ? value : null),
      connectNulls: false, showSymbol: trend.length === 1, symbolSize: 6,
      lineStyle: { color: colors.line, width: 2 }, itemStyle: { color: colors.line },
      areaStyle: { color: colors.line, opacity: 0.07 },
    }],
  };
}

/** 不用请求时间代替行情时间，缺失、过期和失败的数据不生成方向判断。 */
export function getInvestmentSectorState(
  item: Pick<InvestmentSectorSignal, "changePercent" | "updatedAt" | "refreshFailed">,
  now = new Date(),
): { label: string; direction: InvestmentSectorSignal["direction"] } {
  const pending = (label: string) => ({ label, direction: "待判断" as const });
  if (item.changePercent === null || !Number.isFinite(item.changePercent)) return pending("暂不可用");
  if (item.refreshFailed) return pending("更新失败 · 保留上次行情");
  const time = quoteTime(item.updatedAt);
  if (!Number.isFinite(time) || time > now.getTime() + 60_000) return pending("时间未核实");
  if (item.updatedAt?.slice(0, 10) !== formatInvestmentTime(now).slice(0, 10)) return pending("历史行情");
  const state = getInvestmentMarketState(now).state;
  const minutes = item.updatedAt.slice(11, 16);
  const sessionClosed = (state === "after-close" && minutes >= "14:55") ||
    (state === "lunch-break" && minutes >= "11:25" && minutes <= "11:31");
  if (!isFreshQuote(item.updatedAt, now) && !sessionClosed) return pending("行情延迟");
  return { label: state === "trading" ? "盘中行情" : "最近行情", direction: getDirection(item.changePercent) };
}

/** 主备源同时失败时保留原始来源和时间，不将旧值重新标成实时信号。 */
export function mergeInvestmentSectorSignals(previous: InvestmentSectorSignal[], incoming: InvestmentSectorSignal[]): InvestmentSectorSignal[] {
  const valid = (item: InvestmentSectorSignal) => item.changePercent !== null && Number.isFinite(item.changePercent);
  const retain = (item: InvestmentSectorSignal): InvestmentSectorSignal => ({
    ...item, isLive: false, refreshFailed: true, direction: "待判断", forecastPercent: undefined,
    reason: "公开来源更新失败，保留上次行情，未生成方向判断。",
  });
  if (!incoming.some(valid)) {
    const retained = previous.filter(valid);
    return retained.length ? retained.map(retain) : incoming;
  }
  return incoming.map(item => {
    const prior = previous.find(row => row.name === item.name && row.source === item.source && valid(row));
    if (!prior) return item;
    const previousTime = quoteTime(prior.updatedAt);
    const incomingTime = quoteTime(item.updatedAt);
    return !valid(item) || (Number.isFinite(previousTime) && (!Number.isFinite(incomingTime) || incomingTime < previousTime))
      ? retain(prior) : item;
  });
}

/** 解析东方财富行业板块列表；接口不可用时保留明确的空行情状态。 */
export function parseEastmoneySectorSignals(payload: unknown, now = new Date()): InvestmentSectorSignal[] {
  const diff =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: { diff?: unknown } }).data?.diff
      : undefined;

  const rows = Array.isArray(diff) ? diff : typeof diff === "object" && diff !== null ? Object.values(diff) : [];
  if (!rows.length) return getFallbackSectorSignals();

  return rows.flatMap((item, index) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.f14 !== "string" || !row.f14.trim()) return [];
    const name = row.f14.trim();
    const changePercent = quoteNumber(row.f3);
    const timestamp = typeof row.f124 === "number" && row.f124 > 0 && row.f124 * 1000 <= now.getTime() + 60_000
        ? formatInvestmentTime(new Date(row.f124 * 1000))
      : null;

    const signal: InvestmentSectorSignal = {
      changePercent,
      direction: "待判断",
      isLive: changePercent !== null && isFreshQuote(timestamp, now),
      name,
      reason: getSectorReason(changePercent),
      source: "东方财富行业板块",
      trend: [],
      updatedAt: timestamp,
    };
    signal.direction = getInvestmentSectorState(signal, now).direction;
    signal.forecastPercent = signal.direction === "待判断" ? undefined : getForecastPercent(changePercent, index);
    if (signal.direction === "待判断") signal.reason = "公开行情或来源时间不足，未生成方向判断。";
    return [signal];
  }).slice(0, 6);
}

/** 新浪备用接口返回赋值语句，只解析 JSON 数据，不执行来源脚本。 */
export function parseSinaSectorSignals(text: string): InvestmentSectorSignal[] {
  const match = text.trim().match(/^var\s+S_Finance_bankuai_sinaindustry\s*=\s*(\{[\s\S]*\})\s*;?$/);
  if (!match) return [];
  try {
    const data: unknown = JSON.parse(match[1]);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
    return Object.values(data).flatMap((value): InvestmentSectorSignal[] => {
      if (typeof value !== "string") return [];
      const fields = value.split(",");
      const changePercent = quoteNumber(fields[5]);
      if (!fields[1]?.trim() || changePercent === null) return [];
      return [{
        name: fields[1].trim(), changePercent, direction: "待判断", isLive: false,
        source: "新浪财经行业板块（备用）", updatedAt: null, trend: [],
        reason: "备用来源未提供行情时间，仅展示来源返回值，不生成方向判断。",
      }];
    }).sort((a, b) => b.changePercent! - a.changePercent!).slice(0, 6);
  } catch {
    return [];
  }
}

/** 仅在公开行情不可达时显示的降级板块，不把它标成实时行情。 */
export function getFallbackSectorSignals(): InvestmentSectorSignal[] {
  return fallbackSectorNames.map(name => ({
    changePercent: null,
    direction: "待判断" as const,
    forecastPercent: undefined,
    isLive: false,
    name,
    reason: "公开行情暂不可用，等待下一次刷新。",
    source: "公开板块行情",
    trend: [],
    updatedAt: null,
  }));
}

function getDirection(value: number | null): InvestmentSectorSignal["direction"] {
  if (value === null) return "待判断";
  if (Math.abs(value) < 0.35) return "震荡";
  return value > 0 ? "偏涨" : "偏弱";
}

function getForecastPercent(value: number | null, seed: number) {
  if (value === null) return undefined;
  return Number(Math.max(-1.2, Math.min(1.2, value * 0.42 + (seed % 3 - 1) * 0.08)).toFixed(2));
}

function getSectorReason(value: number | null) {
  if (value === null) return "公开行情暂不可用，未生成方向判断。";
  if (value > 0.8) return "当日强势，结合规则 MD 观察次日延续性。";
  if (value < -0.8) return "当日承压，结合规则 MD 观察风险是否收敛。";
  return "当日波动有限，规则模型维持震荡判断。";
}
