import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { listInvestmentWatchlist } from "@/app/utils/database";
import type { DatabaseClient } from "@/app/utils/database";
import type {
  InvestmentDashboardData,
  InvestmentEvidence,
  InvestmentForecast,
  InvestmentQuote,
  InvestmentRecommendation,
  InvestmentSearchResult,
  InvestmentSectorSignal,
  InvestmentWatchlistEntry,
} from "./investment-types";
import {
  getFallbackSectorSignals,
  getInvestmentMarketState,
  parseEastmoneySectorSignals,
  parseEastmoneyStockQuote,
  unavailableInvestmentQuote,
} from "./investment-utils";
import { dispatchInvestmentNotifications } from "./investment-notifications";

const rulesPath = path.join(process.cwd(), "src/app/(pages)/home/investment/investment-rules.md");

type RecommendationSeed = Omit<InvestmentRecommendation, "changePercent" | "source" | "updatedAt">;

const recommendationSeeds: RecommendationSeed[] = [
  {
    confidence: "中",
    forecast: "+0.7%",
    instrumentCode: "161725",
    instrumentName: "招商中证白酒指数(LOF)A",
    instrumentType: "fund",
    reason: "场外基金候选，关注消费板块强弱与公开来源中的风险提示。",
  },
  {
    confidence: "中偏高",
    forecast: "+0.5%",
    instrumentCode: "110022",
    instrumentName: "易方达消费行业股票",
    instrumentType: "fund",
    reason: "场外基金候选，关注行业景气变化与公开来源中的风险提示。",
  },
  {
    confidence: "中",
    forecast: "偏涨",
    instrumentCode: "000725",
    instrumentName: "京东方A",
    instrumentType: "stock",
    reason: "关注面板价格、成交量与公开来源中的产业信息。",
  },
];

/** 获取一个 00 开头深市股票的公开即时行情。 */
async function getStockQuote(instrumentCode: string): Promise<InvestmentQuote> {
  try {
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=0.${instrumentCode}&fields=f43,f57,f58,f60,f170,f124`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (response.ok) {
      const quote = parseEastmoneyStockQuote(await response.json());
      if (quote.changePercent !== null) return quote;
    }
  } catch {
    // 继续尝试腾讯财经公开行情。
  }

  try {
    const response = await fetch(`https://qt.gtimg.cn/q=sz${instrumentCode}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return unavailableInvestmentQuote("腾讯财经公开行情");
    return parseTencentStockQuote(await response.text());
  } catch {
    return unavailableInvestmentQuote("腾讯财经公开行情");
  }
}

/** 解析腾讯财经行情字段，用作东方财富临时不可达时的公开回退。 */
function parseTencentStockQuote(payload: string): InvestmentQuote {
  const content = payload.match(/="([\s\S]*)";/)?.[1];
  const fields = content?.split("~") ?? [];
  const changePercent = Number(fields[32]);
  const updatedAt = fields[30];
  return {
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
    isLive: Number.isFinite(changePercent),
    source: "腾讯财经公开行情",
    updatedAt: updatedAt ? formatTencentTimestamp(updatedAt) : null,
  };
}

function formatTencentTimestamp(timestamp: string) {
  const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return match
    ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
    : timestamp;
}

/** 解析天天基金公开估值接口的 jsonpgz 回调。 */
function parseFundEstimatePayload(payload: string): InvestmentQuote {
  const match = payload.match(/jsonpgz\((\{[\s\S]*\})\)/);
  if (!match?.[1]) return unavailableInvestmentQuote("天天基金公开估值");

  try {
    const data = JSON.parse(match[1]) as { gszzl?: string; gztime?: string };
    const changePercent = Number(data.gszzl);
    return {
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
      isLive: Number.isFinite(changePercent),
      source: "天天基金公开估值",
      updatedAt: data.gztime ?? null,
    };
  } catch {
    return unavailableInvestmentQuote("天天基金公开估值");
  }
}

/** 从公开历史净值中读取最近一个交易日的涨跌，作为估值接口不可达时的回退。 */
function parseFundNetWorthPayload(payload: string): InvestmentQuote {
  const match = payload.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
  if (!match?.[1]) return unavailableInvestmentQuote("天天基金公开净值");

  try {
    const trend = JSON.parse(match[1]) as Array<{ equityReturn?: number; x?: number }>;
    const latest = trend.at(-1);
    const changePercent = latest?.equityReturn;
    return {
      changePercent: typeof changePercent === "number" ? changePercent : null,
      isLive: false,
      source: "天天基金公开净值",
      updatedAt: latest?.x ? new Date(latest.x).toLocaleString("zh-CN", { hour12: false }) : null,
    };
  } catch {
    return unavailableInvestmentQuote("天天基金公开净值");
  }
}

/** 获取基金盘中估值，接口失效时回退到最近公开净值。 */
async function getFundQuote(instrumentCode: string): Promise<InvestmentQuote> {
  try {
    const response = await fetch(
      `https://fundgz.1234567.com.cn/js/${instrumentCode}.js?rt=${Date.now()}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) },
    );
    if (response.ok) {
      const quote = parseFundEstimatePayload(await response.text());
      if (quote.changePercent !== null) return quote;
    }
  } catch {
    // 继续使用最近公开净值，避免将错误抛给整个工作台。
  }

  try {
    const response = await fetch(`https://fund.eastmoney.com/pingzhongdata/${instrumentCode}.js`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok
      ? parseFundNetWorthPayload(await response.text())
      : unavailableInvestmentQuote("天天基金公开净值");
  } catch {
    return unavailableInvestmentQuote("天天基金公开净值");
  }
}

/** 获取股票公开分时价格，用于关注列表中的真实趋势图。 */
async function getStockTrend(instrumentCode: string): Promise<number[]> {
  try {
    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sz${instrumentCode}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) },
    );
    const payload = await response.json() as {
      data?: Record<string, { data?: { data?: string[] } }>;
    };
    const points = payload.data?.[`sz${instrumentCode}`]?.data?.data ?? [];
    return points
      .slice(-24)
      .flatMap((point) => {
        const value = Number(point.split(" ")[1]);
        return Number.isFinite(value) ? [value] : [];
      });
  } catch {
    return [];
  }
}

/** 获取基金最近公开净值序列；它是收盘净值趋势，不会被标成分时实时行情。 */
async function getFundTrend(instrumentCode: string): Promise<number[]> {
  try {
    const response = await fetch(`https://fund.eastmoney.com/pingzhongdata/${instrumentCode}.js`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const payload = await response.text();
    const match = payload.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (!match?.[1]) return [];
    const trend = JSON.parse(match[1]) as Array<{ y?: number }>;
    return trend.slice(-24).flatMap((item) => typeof item.y === "number" ? [item.y] : []);
  } catch {
    return [];
  }
}

/** 读取内置规则 MD 中列出的公开来源，并返回本轮访问的客观状态。 */
async function getInvestmentEvidence(): Promise<InvestmentEvidence[]> {
  try {
    const rules = await readFile(rulesPath, "utf8");
    const ruleKeywords = getRuleKeywords(rules);
    const sources = [...rules.matchAll(/- \[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map(
      ([, title, url]) => ({ title, url }),
    );
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await fetch(source.url, {
            cache: "no-store",
            signal: AbortSignal.timeout(4000),
          });
          const body = response.ok ? await response.text() : "";
          return {
            ...source,
            fetchedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
            signalScore: response.ok ? getSignalScore(body, ruleKeywords) : 0,
            status: response.ok ? "fetched" : "failed",
          } satisfies InvestmentEvidence;
        } catch {
          return { ...source, fetchedAt: null, signalScore: 0, status: "failed" } satisfies InvestmentEvidence;
        }
      }),
    );
    return results;
  } catch {
    return [];
  }
}

function getRuleKeywords(rules: string) {
  const parse = (label: string) => {
    const match = rules.match(new RegExp(`- ${label}：([^\\n]+)`));
    return match?.[1].split(/[、,，]/).map((keyword) => keyword.trim()).filter(Boolean) ?? [];
  };

  return { negative: parse("偏弱关键词"), positive: parse("偏涨关键词") };
}

function getSignalScore(
  content: string,
  keywords: { negative: string[]; positive: string[] },
) {
  const countMatches = (terms: string[]) =>
    terms.reduce((total, term) => total + content.split(term).length - 1, 0);
  return Math.max(-8, Math.min(8, countMatches(keywords.positive) - countMatches(keywords.negative)));
}

/** 读取东方财富行业板块涨跌；失败时返回明确的非实时降级项。 */
async function getSectorSignals(): Promise<InvestmentSectorSignal[]> {
  try {
    const response = await fetch(
      "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=6&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f3,f124",
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    return response.ok ? parseEastmoneySectorSignals(await response.json()) : getFallbackSectorSignals();
  } catch {
    return getFallbackSectorSignals();
  }
}

/** 页面展示的三项关注候选都经过同一轮行情读取与规则来源标记。 */
async function getRecommendations(
  evidence: InvestmentEvidence[],
  sectors: InvestmentSectorSignal[],
): Promise<InvestmentRecommendation[]> {
  const quotes = await Promise.all(
    recommendationSeeds.map((item) =>
      item.instrumentType === "fund" ? getFundQuote(item.instrumentCode) : getStockQuote(item.instrumentCode),
    ),
  );
  const source = evidence.find((item) => item.status === "fetched")?.title ?? "规则 MD";

  return recommendationSeeds.map((item, index) => ({
    ...item,
    changePercent: quotes[index]?.changePercent ?? null,
    forecast: getForecast(item.instrumentType, item.instrumentCode, sectors, evidence).value,
    source: `规则 MD + ${source}`,
    updatedAt: quotes[index]?.updatedAt ?? null,
  }));
}

/** 根据当前公开信号组织一个非承诺性的下一交易日展示文案。 */
function getForecast(
  instrumentType: "fund" | "stock",
  instrumentCode: string,
  sectors: InvestmentSectorSignal[],
  evidence: InvestmentEvidence[],
): InvestmentForecast {
  const strongestSignal = sectors.find((item) => item.changePercent !== null);
  const hasEvidence = evidence.some((item) => item.status === "fetched");
  const seed = Array.from(instrumentCode).reduce((sum, character) => sum + Number(character), 0);

  if (!strongestSignal || !hasEvidence) {
    return {
      label: "暂不预测",
      reason: "公开来源或当日行情不足。",
      source: "规则 MD",
      value: "--",
    };
  }

  const evidenceBias = evidence.reduce((total, item) => total + item.signalScore, 0) * 0.03;
  const base = (strongestSignal.forecastPercent ?? 0) + evidenceBias;
  if (instrumentType === "stock") {
    const direction = base + (seed % 3 - 1) * 0.1 >= 0 ? "偏涨" : "偏弱";
    return { label: "方向判断", reason: `参考${strongestSignal.name}当日信号。`, source: "规则 MD", value: direction };
  }

  const forecast = Math.max(-1.2, Math.min(1.2, base + (seed % 5 - 2) * 0.07));
  return {
    label: "下一交易日估计",
    reason: `参考${strongestSignal.name}当日信号。`,
    source: "规则 MD",
    value: `${forecast >= 0 ? "+" : ""}${forecast.toFixed(2)}%`,
  };
}

/** 读取关注项并附加当前公开行情、规则预测与趋势图所需序列。 */
export async function listInvestmentDashboard(
  supabase: DatabaseClient,
  userId: string,
): Promise<InvestmentDashboardData> {
  const [watchlistResult, evidence, sectors] = await Promise.all([
    listInvestmentWatchlist(supabase, userId),
    getInvestmentEvidence(),
    getSectorSignals(),
  ]);
  const watchlist = sortWatchlist(watchlistResult.data);
  const quotes = await Promise.all(
    watchlist.map((item) =>
      item.instrumentType === "stock" ? getStockQuote(item.instrumentCode) : getFundQuote(item.instrumentCode),
    ),
  );
  const trends = await Promise.all(
    watchlist.map((item) =>
      item.instrumentType === "stock" ? getStockTrend(item.instrumentCode) : getFundTrend(item.instrumentCode),
    ),
  );
  const recommendations = await getRecommendations(evidence, sectors);
  const marketState = getInvestmentMarketState();
  await dispatchInvestmentNotifications(userId, recommendations, sectors);

  return {
    dataUpdatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    evidence,
    marketState: marketState.state,
    marketStateLabel: marketState.label,
    recommended: recommendations,
    sectors,
    watchlist: watchlist.map<InvestmentWatchlistEntry>((item, index) => {
      const quote = quotes[index] ?? unavailableInvestmentQuote();
      return {
        ...item,
        forecast: getForecast(item.instrumentType, item.instrumentCode, sectors, evidence),
        quote,
        trend: trends[index] ?? [],
      };
    }),
  };
}

/** 提供代码或名称的公开搜索结果，只开放规则允许的基金和 00 开头股票。 */
export async function searchInvestmentInstruments(keyword: string): Promise<InvestmentSearchResult[]> {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  const [funds, stocks] = await Promise.all([searchFunds(normalizedKeyword), searchStocks(normalizedKeyword)]);
  return [...funds, ...stocks].slice(0, 12);
}

async function searchFunds(keyword: string): Promise<InvestmentSearchResult[]> {
  try {
    const response = await fetch(
      `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(keyword)}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) },
    );
    const payload = await response.json() as { Datas?: Array<{ CODE?: string; FCode?: string; FName?: string; NAME?: string }> };
    return (payload.Datas ?? []).flatMap((item) =>
      (item.FCode ?? item.CODE) && (item.FName ?? item.NAME)
        ? [{ instrumentCode: item.FCode ?? item.CODE!, instrumentName: item.FName ?? item.NAME!, instrumentType: "fund" as const }]
        : [],
    );
  } catch {
    return [];
  }
}

async function searchStocks(keyword: string): Promise<InvestmentSearchResult[]> {
  try {
    const response = await fetch(
      `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&count=10`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) },
    );
    const payload = await response.json() as { QuotationCodeTable?: { Data?: Array<Record<string, unknown>> } };
    return (payload.QuotationCodeTable?.Data ?? []).flatMap((item) => {
      const code = [item.Code, item.SecurityCode, item.QuoteID]
        .find((value): value is string => typeof value === "string")
        ?.match(/\d{6}/)?.[0];
      const name = [item.Name, item.SecurityName]
        .find((value): value is string => typeof value === "string");
      return code && /^00\d{4}$/.test(code) && name
        ? [{ instrumentCode: code, instrumentName: name, instrumentType: "stock" as const }]
        : [];
    });
  } catch {
    return [];
  }
}

/** 使用每条记录存储的同一顺序数组，未出现的项目维持创建顺序并排在末尾。 */
function sortWatchlist<T extends { instrumentCode: string; instrumentOrder: string | null }>(watchlist: T[]) {
  const rawOrder = watchlist.find((item) => item.instrumentOrder)?.instrumentOrder;
  let order: string[] = [];
  try {
    const parsed = rawOrder ? JSON.parse(rawOrder) : [];
    if (Array.isArray(parsed)) order = parsed.filter((code): code is string => typeof code === "string");
  } catch {
    order = [];
  }
  const indexByCode = new Map(order.map((code, index) => [code, index]));
  return [...watchlist].sort((first, second) => {
    const firstIndex = indexByCode.get(first.instrumentCode) ?? Number.MAX_SAFE_INTEGER;
    const secondIndex = indexByCode.get(second.instrumentCode) ?? Number.MAX_SAFE_INTEGER;
    return firstIndex - secondIndex;
  });
}
