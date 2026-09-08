import type { InvestmentSearchResult } from "./investment-types";

export type InvestmentFilter = "all" | "fund" | "stock";

export type InvestmentSearchRow = InvestmentSearchResult & {
  isWatched: boolean;
};

export type SearchHighlightSegment = {
  highlighted: boolean;
  text: string;
};

/** 按当前品种筛选搜索结果，并标记已经存在于关注列表中的项目。 */
export function buildInvestmentSearchRows(
  results: InvestmentSearchResult[],
  watchlist: Array<{ instrumentCode: string }>,
  filter: InvestmentFilter,
): InvestmentSearchRow[] {
  const watchedCodes = new Set(watchlist.map((item) => item.instrumentCode));
  return results
    .filter((item) => filter === "all" || item.instrumentType === filter)
    .map((item) => ({
      ...item,
      isWatched: watchedCodes.has(item.instrumentCode),
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
