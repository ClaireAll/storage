import dayjs from "dayjs";
import type {
  InvestmentMarketState,
  InvestmentQuote,
  InvestmentSectorSignal,
} from "./investment-types";

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
    return { label: "休市 · 展示最近交易日收盘数据", state: "non-trading" };
  }

  if (minutes < 9 * 60 + 30) {
    return { label: "开盘前 · 展示上一交易日收盘数据", state: "pre-open" };
  }

  if (minutes < 11 * 60 + 30) {
    return { label: "盘中 · 行情实时更新", state: "trading" };
  }

  if (minutes < 13 * 60) {
    return { label: "午间休市 · 行情截至 11:30", state: "lunch-break" };
  }

  if (minutes < 15 * 60) {
    return { label: "盘中 · 行情实时更新", state: "trading" };
  }

  return { label: "已收盘 · 展示当日收盘数据", state: "after-close" };
}

/** 为无法访问的行情返回明确的不可用状态。 */
export function unavailableInvestmentQuote(source = "公开行情接口"): InvestmentQuote {
  return { changePercent: null, isLive: false, source, updatedAt: null };
}

/** 解析东方财富股票即时字段，涨跌幅字段的单位为万分之一。 */
export function parseEastmoneyStockQuote(payload: unknown): InvestmentQuote {
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: Record<string, unknown> }).data
      : undefined;
  const changePercent = data?.f170;
  const timestamp = data?.f124;

  return {
    changePercent:
      typeof changePercent === "number" ? Number((changePercent / 100).toFixed(2)) : null,
    isLive: typeof changePercent === "number",
    source: "东方财富公开行情",
    updatedAt:
      typeof timestamp === "number" && timestamp > 0
        ? dayjs(timestamp * 1000).format("YYYY-MM-DD HH:mm")
        : null,
  };
}

/** 解析东方财富行业板块列表；接口不可用时保留明确的空行情状态。 */
export function parseEastmoneySectorSignals(payload: unknown): InvestmentSectorSignal[] {
  const diff =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: { diff?: unknown[] } }).data?.diff
      : undefined;

  if (!Array.isArray(diff) || !diff.length) return getFallbackSectorSignals();

  return diff.slice(0, 6).flatMap((item, index) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    const name = typeof row.f14 === "string" ? row.f14 : fallbackSectorNames[index];
    const changePercent = typeof row.f3 === "number" ? Number((row.f3 / 100).toFixed(2)) : null;
    const timestamp = typeof row.f124 === "number" && row.f124 > 0
      ? dayjs(row.f124 * 1000).format("YYYY-MM-DD HH:mm")
      : null;

    return [{
      changePercent,
      direction: getDirection(changePercent),
      forecastPercent: getForecastPercent(changePercent, index),
      isLive: changePercent !== null,
      name,
      reason: getSectorReason(changePercent),
      source: "东方财富行业板块",
      trend: buildSignalTrend(changePercent, index),
      updatedAt: timestamp,
    } satisfies InvestmentSectorSignal];
  });
}

/** 仅在公开行情不可达时显示的降级板块，不把它标成实时行情。 */
export function getFallbackSectorSignals(): InvestmentSectorSignal[] {
  return fallbackSectorNames.map((name, index) => ({
    changePercent: null,
    direction: "震荡" as const,
    forecastPercent: undefined,
    isLive: false,
    name,
    reason: "公开行情暂不可用，等待下一次刷新。",
    source: "东方财富行业板块",
    trend: buildSignalTrend(null, index),
    updatedAt: null,
  }));
}

/** 给仪表盘信号图提供一致的视觉序列，数值不可用时不代表实际价格走势。 */
function buildSignalTrend(changePercent: number | null, seed: number) {
  if (changePercent === null) return [];
  const start = 46 - changePercent * 5;
  return Array.from({ length: 10 }, (_, index) =>
    Math.max(8, Math.min(92, start + index * changePercent * 1.2 + ((seed + index * 3) % 7) - 3)),
  );
}

function getDirection(value: number | null): InvestmentSectorSignal["direction"] {
  if (value === null || Math.abs(value) < 0.35) return "震荡";
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
