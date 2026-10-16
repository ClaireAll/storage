import "server-only";

import type { InvestmentQuote, InvestmentQuoteUpdate } from "./investment-types";
import {
  formatInvestmentTime,
  getInvestmentMarketState,
  parseEastmoneyStockQuote,
  parseFundValuation,
  parseTencentStockQuotes,
  selectFundQuote,
  unavailableInvestmentQuote,
} from "./investment-utils";

type Instrument = Pick<InvestmentQuoteUpdate, "instrumentType" | "instrumentCode">;

async function getFundQuotes(codes: string[], now: Date) {
  if (!codes.length) return new Map<string, InvestmentQuote>();
  for (const host of ["fundcomapi.tiantianfunds.com", "fundcomapi.eastmoney.com"]) {
    try {
      const url = new URL(`https://${host}/mm/newCore/FundValuationLast`);
      url.searchParams.set("FCODES", codes.join(","));
      url.searchParams.set("FIELDS", "FCODE,GSZZL,GZTIME,GSZ,NAV,PDATE");
      url.searchParams.set("_", String(now.getTime()));
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (!response.ok) continue;
      const payload = await response.json() as { success?: boolean; data?: Array<Record<string, unknown>> };
      if (payload.success === false || !Array.isArray(payload.data)) continue;
      return new Map(payload.data.filter(row => row && typeof row.FCODE === "string" && codes.includes(row.FCODE))
        .map(row => [String(row.FCODE), parseFundValuation(row, now)]));
    } catch {
      // 主域不可用时尝试备用域；没有估值的基金回退到已公布净值。
    }
  }
  return new Map<string, InvestmentQuote>();
}

async function getStockQuotes(codes: string[], now: Date) {
  let quotes = new Map<string, InvestmentQuote>();
  if (!codes.length) return quotes;
  try {
    const response = await fetch(`https://qt.gtimg.cn/q=${codes.map(code => `sz${code}`).join(",")}&_=${now.getTime()}`, {
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (response.ok) quotes = parseTencentStockQuotes(await response.text(), now);
  } catch {
    // 股票主源不可达时按代码读取备用行情。
  }
  await Promise.all(codes.filter(code => !quotes.has(code) || !quotes.get(code)?.updatedAt || (getInvestmentMarketState(now).state === "trading" && !quotes.get(code)?.isLive)).map(async code => {
    try {
      const response = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=0.${code}&fields=f43,f59,f170,f124&_=${now.getTime()}`, {
        cache: "no-store", signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return;
      const quote = parseEastmoneyStockQuote(await response.json(), now);
      const previous = quotes.get(code);
      if (quote.changePercent !== null && (!previous?.updatedAt || (quote.updatedAt && quote.updatedAt >= previous.updatedAt))) quotes.set(code, quote);
    } catch {
      // 单个代码失败不影响其他关注项。
    }
  }));
  return quotes;
}

async function getFundHistory(code: string): Promise<{ quote: InvestmentQuote; trend: number[]; trendLabels: string[] }> {
  const empty = { quote: unavailableInvestmentQuote("天天基金公开净值"), trend: [], trendLabels: [] };
  try {
    const response = await fetch(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
      cache: "no-store", signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return empty;
    const match = (await response.text()).match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return empty;
    const points = JSON.parse(match[1]) as Array<{ equityReturn?: number; x?: number; y?: number }>;
    if (!Array.isArray(points)) return empty;
    const validPoints = points.filter((point): point is { equityReturn?: number; x: number; y: number } =>
      typeof point?.y === "number" && Number.isFinite(point.y) && point.y > 0 &&
      typeof point.x === "number" && Number.isFinite(point.x) && point.x > 0);
    const latest = validPoints.at(-1);
    const changePercent = typeof latest?.equityReturn === "number" && Number.isFinite(latest.equityReturn) ? latest.equityReturn : null;
    return {
      quote: {
        price: latest?.y ?? null,
        changePercent, kind: "nav", isLive: false, source: "天天基金公开净值",
        updatedAt: typeof latest?.x === "number" && Number.isFinite(latest.x) ? formatInvestmentTime(new Date(latest.x)) : null,
      },
      trend: validPoints.slice(-24).map(point => point.y),
      trendLabels: validPoints.slice(-24).map(point => formatInvestmentTime(new Date(point.x)).slice(0, 10)),
    };
  } catch {
    return empty;
  }
}

async function getStockTrend(code: string) {
  const empty: { trend: number[]; trendLabels: string[]; trendDate?: string } = { trend: [], trendLabels: [] };
  try {
    const response = await fetch(`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sz${code}`, {
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return empty;
    const payload = await response.json() as { data?: Record<string, { data?: { data?: string[]; date?: string } }> };
    const minuteData = payload.data?.[`sz${code}`]?.data;
    const dateParts = minuteData?.date?.match(/^(\d{4})(\d{2})(\d{2})$/);
    const trendDate = dateParts ? `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}` : undefined;
    const points = (minuteData?.data ?? []).flatMap(point => {
      if (typeof point !== "string") return [];
      const [time, rawPrice] = point.trim().split(/\s+/);
      const clock = time?.match(/^(\d{2})(\d{2})$/);
      const value = Number(rawPrice);
      return clock && Number(clock[1]) < 24 && Number(clock[2]) < 60 && Number.isFinite(value) && value > 0
        ? [{ price: value, time: `${clock[1]}:${clock[2]}` }] : [];
    });
    return { trend: points.map(point => point.price), trendLabels: points.map(point => point.time), trendDate };
  } catch {
    return empty;
  }
}

/** 同类型代码批量读取、去重，新闻和通知不会阻塞这条行情链路。 */
export async function getInvestmentQuotes(
  instruments: Instrument[],
  { includeFundHistory = true, now = new Date() } = {},
): Promise<InvestmentQuoteUpdate[]> {
  const unique = [...new Map(instruments.map(item => [`${item.instrumentType}:${item.instrumentCode}`, item])).values()]
    .filter(item => /^\d{6}$/.test(item.instrumentCode) && (item.instrumentType === "fund" || (item.instrumentType === "stock" && /^00\d{4}$/.test(item.instrumentCode))));
  const stocks = unique.filter(item => item.instrumentType === "stock").map(item => item.instrumentCode);
  const funds = unique.filter(item => item.instrumentType === "fund").map(item => item.instrumentCode);
  const stockTrends = new Map(stocks.map(code => [code, getStockTrend(code)]));
  const [stockQuotes, fundQuotes] = await Promise.all([getStockQuotes(stocks, now), getFundQuotes(funds, now)]);
  return Promise.all(unique.map(async item => {
    if (item.instrumentType === "stock") {
      const points = await stockTrends.get(item.instrumentCode);
      const quote = stockQuotes.get(item.instrumentCode) ?? unavailableInvestmentQuote("股票行情暂不可用");
      const wrongDay = points?.trendDate && quote.updatedAt && points.trendDate !== quote.updatedAt.slice(0, 10);
      return {
        ...item, quote,
        trend: wrongDay ? [] : points?.trend ?? [], trendLabels: wrongDay ? [] : points?.trendLabels ?? [], trendDate: wrongDay ? undefined : points?.trendDate,
      };
    }
    const estimate = fundQuotes.get(item.instrumentCode) ?? unavailableInvestmentQuote("天天基金盘中估值");
    // 盘中快刷只在估值缺失/过期时读历史；收盘后优先比较已公布净值。
    const history = includeFundHistory || !estimate.isLive ? await getFundHistory(item.instrumentCode) : undefined;
    return { ...item, quote: history ? selectFundQuote(estimate, history.quote) : estimate, trend: history?.trend, trendLabels: history?.trendLabels };
  }));
}
