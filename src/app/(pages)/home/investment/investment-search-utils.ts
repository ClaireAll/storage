import type { InvestmentSearchResult } from "./investment-types";

export type InvestmentFilter = "all" | "fund" | "stock";

export type InvestmentSearchRow = InvestmentSearchResult & {
  isWatched: boolean;
};

export type SearchHighlightSegment = {
  highlighted: boolean;
  text: string;
};

/** 搜索源同时返回基金、股票和指数，按明确的品种字段分类。 */
export function parseInvestmentSuggestions(payload: unknown): InvestmentSearchResult[] {
  const rows = (payload as { Datas?: unknown[] } | null)?.Datas;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((value): InvestmentSearchResult[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const code = item.CODE;
    const name = item.NAME;
    if (typeof code !== "string" || !/^\d{6}$/.test(code) || typeof name !== "string" || !name.trim()) return [];
    if (Number(item.CATEGORY) === 150 && String(item.STOCKMARKET) === "2" && /^00\d{4}$/.test(code)) {
      return [{ instrumentCode: code, instrumentName: name, instrumentType: "stock" }];
    }
    if (Number(item.CATEGORY) === 700 && item.FundBaseInfo && typeof item.FundBaseInfo === "object" && (item.FundBaseInfo as { FCODE?: string }).FCODE === code) {
      return [{ instrumentCode: code, instrumentName: name, instrumentType: "fund" }];
    }
    return [];
  });
}

export function matchInvestmentIdentity(instrument: InvestmentSearchResult, candidates: InvestmentSearchResult[]) {
  const normalize = (name: string) => name.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
  const matches = candidates.filter(item => item.instrumentCode === instrument.instrumentCode && normalize(item.instrumentName) === normalize(instrument.instrumentName));
  return matches.length === 1 ? matches[0] : matches.find(item => item.instrumentType === instrument.instrumentType) ?? null;
}

/** 按当前品种筛选搜索结果，并标记已经存在于关注列表中的项目。 */
export function buildInvestmentSearchRows(
  results: InvestmentSearchResult[],
  watchlist: Array<{ instrumentCode: string; instrumentType: "fund" | "stock" }>,
  filter: InvestmentFilter,
): InvestmentSearchRow[] {
  const watchedCodes = new Set(watchlist.map((item) => `${item.instrumentType}:${item.instrumentCode}`));
  return results
    .filter((item) => filter === "all" || item.instrumentType === filter)
    .map((item) => ({
      ...item,
      isWatched: watchedCodes.has(`${item.instrumentType}:${item.instrumentCode}`),
    }));
}

/** 将代码或名称拆分为普通片段与命中片段，供搜索结果逐段高亮。 */
export function splitSearchHighlight(text: string, keyword: string): SearchHighlightSegment[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return [{ highlighted: false, text }];

  const normalizedText = text.toLocaleLowerCase();
  const segments: SearchHighlightSegment[] = [];
  let offset = 0;
  let matchIndex = normalizedText.indexOf(normalizedKeyword, offset);

  while (matchIndex >= 0) {
    if (matchIndex > offset) {
      segments.push({ highlighted: false, text: text.slice(offset, matchIndex) });
    }
    const matchEnd = matchIndex + normalizedKeyword.length;
    segments.push({ highlighted: true, text: text.slice(matchIndex, matchEnd) });
    offset = matchEnd;
    matchIndex = normalizedText.indexOf(normalizedKeyword, offset);
  }

  if (offset < text.length) {
    segments.push({ highlighted: false, text: text.slice(offset) });
  }

  return segments.length ? segments : [{ highlighted: false, text }];
}
