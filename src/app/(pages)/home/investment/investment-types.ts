import type { InvestmentInstrumentType, InvestmentWatchlistItem } from "@/app/utils/database";

export type InvestmentMarketState =
  | "after-close"
  | "lunch-break"
  | "pre-open"
  | "trading"
  | "non-trading";

export type InvestmentQuote = {
  price?: number | null;
  changePercent: number | null;
  kind: "stock" | "estimate" | "nav" | "unavailable";
  isLive: boolean;
  refreshFailed?: boolean;
  source: string;
  updatedAt: string | null;
};

export type InvestmentForecast = {
  label: string;
  reason: string;
  source: string;
  value: string;
};

export type InvestmentWatchlistEntry = InvestmentWatchlistItem & {
  forecast: InvestmentForecast;
  quote: InvestmentQuote;
  trend: number[];
  trendLabels?: string[];
  trendDate?: string;
};

export type InvestmentEvidence = {
  fetchedAt: string | null;
  signalScore: number;
  status: "fetched" | "failed";
  title: string;
  url: string;
};

export type InvestmentDashboardData = {
  dataUpdatedAt: string;
  quotesCheckedAt: string;
  evidence: InvestmentEvidence[];
  marketState: InvestmentMarketState;
  marketStateLabel: string;
  recommended: InvestmentRecommendation[];
  sectors: InvestmentSectorSignal[];
  watchlist: InvestmentWatchlistEntry[];
};

export type InvestmentRecommendation = {
  quote: InvestmentQuote;
  changePercent: number | null;
  confidence: "中" | "中偏高";
  forecast: string;
  instrumentCode: string;
  instrumentName: string;
  instrumentType: InvestmentInstrumentType;
  reason: string;
  source: string;
  updatedAt: string | null;
};

export type InvestmentQuoteUpdate = {
  instrumentCode: string;
  instrumentType: "fund" | "stock";
  quote: InvestmentQuote;
  trend?: number[];
  trendLabels?: string[];
  trendDate?: string;
};

export type InvestmentQuoteSnapshot = Pick<InvestmentDashboardData,
  "marketState" | "marketStateLabel" | "quotesCheckedAt"
> & {
  quotes: InvestmentQuoteUpdate[];
  instruments?: Array<Pick<InvestmentWatchlistEntry, "id" | "instrumentCode" | "instrumentName" | "instrumentType">>;
};

export type InvestmentSectorSignal = {
  changePercent: number | null;
  direction: "偏涨" | "偏弱" | "震荡" | "待判断";
  forecastPercent?: number;
  isLive: boolean;
  refreshFailed?: boolean;
  name: string;
  reason: string;
  source: string;
  trend: number[];
  updatedAt: string | null;
};

export type InvestmentSearchResult = {
  instrumentCode: string;
  instrumentName: string;
  instrumentType: InvestmentInstrumentType;
};
