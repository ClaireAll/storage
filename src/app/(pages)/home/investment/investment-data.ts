import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { listInvestmentWatchlist } from "@/app/utils/database";
import type { DatabaseClient, InvestmentWatchlistItem } from "@/app/utils/database";
import type {
  InvestmentDashboardData,
  InvestmentEvidence,
  InvestmentForecast,
  InvestmentQuoteUpdate,
  InvestmentQuoteSnapshot,
  InvestmentRecommendation,
  InvestmentSearchResult,
  InvestmentSectorSignal,
  InvestmentWatchlistEntry,
} from "./investment-types";
import {
  getFallbackSectorSignals,
  formatInvestmentTime,
  getInvestmentMarketState,
  getInvestmentSectorState,
  mergeInvestmentSectorSignals,
  parseEastmoneySectorSignals,
  parseSinaSectorSignals,
  unavailableInvestmentQuote,
} from "./investment-utils";
import { dispatchInvestmentNotifications } from "./investment-notifications";
import { getInvestmentQuotes } from "./investment-quotes";
import { matchInvestmentIdentity, parseInvestmentSuggestions } from "./investment-search-utils";

const rulesPath = path.join(process.cwd(), "src/app/(pages)/home/investment/investment-rules.md");

type RecommendationSeed = Omit<InvestmentRecommendation, "changePercent" | "source" | "updatedAt" | "quote">;

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

// shortcut: 公开板块快照仅保存在当前服务进程；需要跨重启保留时接入共享缓存。
let lastSectorSignals: InvestmentSectorSignal[] = [];

/** 主源失败时读取新浪备用源；均不可用时保留最近成功值及其原始时间。 */
async function getSectorSignals(): Promise<InvestmentSectorSignal[]> {
  let sectors: InvestmentSectorSignal[] = [];
  try {
    const response = await fetch(
      "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=6&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f3,f124",
      { cache: "no-store", signal: AbortSignal.timeout(3000) },
    );
    if (response.ok) sectors = parseEastmoneySectorSignals(await response.json());
  } catch {
    // 单个公共源失败不阻止备用源和最近成功快照兜底。
  }
  if (!sectors.some(item => item.changePercent !== null)) {
    try {
      const response = await fetch("https://vip.stock.finance.sina.com.cn/q/view/newSinaHy.php", {
        cache: "no-store", signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const text = new TextDecoder("gb18030").decode(await response.arrayBuffer());
        sectors = parseSinaSectorSignals(text);
      }
    } catch {
      // 不为失败或来源时间缺失的数据补写当前时间。
    }
  }
  lastSectorSignals = mergeInvestmentSectorSignals(lastSectorSignals, sectors.length ? sectors : getFallbackSectorSignals());
  return lastSectorSignals;
}

/** 页面展示的三项关注候选都经过同一轮行情读取与规则来源标记。 */
function getRecommendations(
  evidence: InvestmentEvidence[],
  sectors: InvestmentSectorSignal[],
  quotes: InvestmentQuoteUpdate[],
): InvestmentRecommendation[] {
  const source = evidence.find((item) => item.status === "fetched")?.title ?? "规则 MD";

  return recommendationSeeds.map((item) => {
    const quote = quotes.find(row => row.instrumentCode === item.instrumentCode && row.instrumentType === item.instrumentType)?.quote ?? unavailableInvestmentQuote();
    return {
      ...item,
      quote,
      changePercent: quote.changePercent,
      forecast: getForecast(item.instrumentType, item.instrumentCode, sectors, evidence).value,
      source: `规则 MD + ${source}`,
      updatedAt: quote.updatedAt,
    };
  });
}

/** 根据当前公开信号组织一个非承诺性的下一交易日展示文案。 */
function getForecast(
  instrumentType: "fund" | "stock",
  instrumentCode: string,
  sectors: InvestmentSectorSignal[],
  evidence: InvestmentEvidence[],
): InvestmentForecast {
  const strongestSignal = sectors.find(item => getInvestmentSectorState(item).direction !== "待判断");
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
  const watchlistPromise = listInvestmentWatchlist(supabase, userId).then(async result => {
    if (result.error) throw new Error("关注列表读取失败");
    return sortWatchlist(await resolveInvestmentWatchlist(result.data));
  });
  const [watchlist, evidence, sectors, quotes] = await Promise.all([
    watchlistPromise,
    getInvestmentEvidence(),
    getSectorSignals(),
    watchlistPromise.then(items => getInvestmentQuotes([...items, ...recommendationSeeds])),
  ]);
  const recommendations = getRecommendations(evidence, sectors, quotes);
  const marketState = getInvestmentMarketState();
  await dispatchInvestmentNotifications(userId, recommendations, sectors);

  return {
    dataUpdatedAt: formatInvestmentTime(),
    quotesCheckedAt: formatInvestmentTime(),
    evidence,
    marketState: marketState.state,
    marketStateLabel: marketState.label,
    recommended: recommendations,
    sectors,
    watchlist: watchlist.map<InvestmentWatchlistEntry>((item) => {
      const row = quotes.find(row => row.instrumentCode === item.instrumentCode && row.instrumentType === item.instrumentType);
      return {
        ...item,
        forecast: getForecast(item.instrumentType, item.instrumentCode, sectors, evidence),
        quote: row?.quote ?? unavailableInvestmentQuote(),
        trend: row?.trend ?? [],
        trendLabels: row?.trendLabels ?? [],
        trendDate: row?.trendDate,
      };
    }),
  };
}

/** 高频刷新仅查询当前用户关注项与推荐行情，不抓新闻或触发企微通知。 */
export async function listInvestmentQuoteSnapshot(supabase: DatabaseClient, userId: string): Promise<InvestmentQuoteSnapshot> {
  const result = await listInvestmentWatchlist(supabase, userId);
  if (result.error) throw new Error("关注列表读取失败");
  const instruments = await resolveInvestmentWatchlist(result.data);
  const quotes = await getInvestmentQuotes([...instruments, ...recommendationSeeds], { includeFundHistory: false });
  const market = getInvestmentMarketState();
  return { quotes, instruments, quotesCheckedAt: formatInvestmentTime(), marketState: market.state, marketStateLabel: market.label };
}

/** 提供代码或名称的公开搜索结果，只开放规则允许的基金和 00 开头股票。 */
export async function searchInvestmentInstruments(keyword: string, cacheIdentity = false): Promise<InvestmentSearchResult[]> {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];
  try {
    const response = await fetch(
      `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(normalizedKeyword)}`,
      { ...(cacheIdentity ? { next: { revalidate: 3600 } } : { cache: "no-store" }), signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return [];
    const seenInstrumentCodes = new Set<string>();
    return parseInvestmentSuggestions(await response.json()).filter(item => {
      const key = `${item.instrumentType}:${item.instrumentCode}`;
      if (seenInstrumentCodes.has(key)) return false;
      seenInstrumentCodes.add(key);
      return true;
    }).sort((a, b) => Number(a.instrumentType === "fund") - Number(b.instrumentType === "fund")).slice(0, 12);
  } catch {
    return [];
  }
}

export async function resolveInvestmentInstrument(instrument: InvestmentSearchResult) {
  return matchInvestmentIdentity(instrument, await searchInvestmentInstruments(instrument.instrumentCode, true));
}

/** 按代码及名称纠正旧记录的类型；不写入数据库，不凭代码前缀猜测基金/股票。 */
async function resolveInvestmentWatchlist(items: InvestmentWatchlistItem[]) {
  const searches = new Map<string, Promise<InvestmentSearchResult[]>>();
  return Promise.all(items.map(async item => {
    let candidates = searches.get(item.instrumentCode);
    if (!candidates) {
      candidates = searchInvestmentInstruments(item.instrumentCode, true);
      searches.set(item.instrumentCode, candidates);
    }
    const resolved = matchInvestmentIdentity(item, await candidates);
    return resolved ? { ...item, ...resolved } : item;
  }));
}

/** 使用每条记录存储的同一顺序数组，未出现的项目维持创建顺序并排在末尾。 */
function sortWatchlist<T extends { instrumentType: string; instrumentCode: string; instrumentOrder: string | null }>(watchlist: T[]) {
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
    const firstIndex = indexByCode.get(`${first.instrumentType}:${first.instrumentCode}`) ?? indexByCode.get(first.instrumentCode) ?? Number.MAX_SAFE_INTEGER;
    const secondIndex = indexByCode.get(`${second.instrumentType}:${second.instrumentCode}`) ?? indexByCode.get(second.instrumentCode) ?? Number.MAX_SAFE_INTEGER;
    return firstIndex - secondIndex;
  });
}
