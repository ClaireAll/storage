"use client";

import { StarFilled } from "@ant-design/icons";
import { Empty, Tag, Tooltip, theme } from "antd";
import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InvestmentWatchlistEntry } from "./investment-types";
import { buildInvestmentChartOptions, formatInvestmentPrice, getInvestmentQuoteLabel } from "./investment-utils";

const mutedText = "text-[color-mix(in_srgb,var(--home-theme-text)_72%,transparent)]";

export function InvestmentDetailPanel({
  item,
  changeLabel,
  changeClassName,
  refreshLabel,
}: {
  item?: InvestmentWatchlistEntry;
  changeLabel: string;
  changeClassName: string;
  refreshLabel: string;
}) {
  if (!item) {
    return <div className="flex min-h-[480px] items-center justify-center"><Empty description="暂无可展示的标的，可在左侧搜索并添加关注" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>;
  }

  const isFund = item.instrumentType === "fund";
  const timeLabel = item.quote.kind === "nav" ? "净值日期" : isFund ? "估值时间" : "行情时间";
  const quoteTime = item.quote.updatedAt?.replace(" 00:00:00", "") ?? "来源未提供时间";
  const chartSource = isFund
    ? `天天基金公开净值 · 最新日期 ${item.trendLabels?.at(-1) ?? "待更新"}`
    : item.trend.length ? `分时采样 ${item.trendDate ?? "来源未提供交易日"} ${item.trendLabels?.at(-1) ?? ""}` : "等待分时数据";

  return (
    <div className="min-w-0">
      <header className="p-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className="m-0 text-xl font-semibold leading-7">{item.instrumentName}</h3>
              <span className={cn("text-sm tabular-nums", mutedText)}>{item.instrumentCode}</span>
              <Tag className="m-0!" color={isFund ? "gold" : "blue"}>{isFund ? "基金" : "股票"}</Tag>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
              <span className={cn("text-[clamp(32px,3vw,44px)] font-semibold leading-tight tracking-tight", changeClassName)}>{formatInvestmentPrice(item.quote, item.instrumentType)}</span>
              <span className={cn("text-2xl font-semibold", changeClassName)}>{changeLabel}</span>
              <span className={cn("text-sm", mutedText)}>{getInvestmentQuoteLabel(item.quote)}</span>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--home-theme-color)_36%,transparent)] px-3 py-2 text-sm text-[color:var(--home-theme-color)]"><StarFilled aria-hidden />已关注</span>
        </div>
        <p className={cn("mb-0 mt-2 flex flex-wrap gap-x-4 text-[13px] tabular-nums", mutedText)}><span>{timeLabel} · {quoteTime}</span><span>{item.quote.source}</span></p>
      </header>

      <section aria-label={`${item.instrumentName}走势详情`} className="home-preview-divider border-y px-4 pb-3 pt-4">
        <h4 className="m-0 px-1 text-sm font-semibold">{isFund ? "近 24 次公布净值" : "分时走势"}</h4>
        <InvestmentPriceChart item={item} />
        <div className={cn("flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px] leading-5", mutedText)}>
          <span>{chartSource}{isFund ? "" : ` · ${refreshLabel}`}</span>
          {isFund ? <span>图表为已公布净值，不是盘中估值曲线。</span> : null}
          {item.trend.length && item.trendLabels?.length !== item.trend.length ? <span>来源未提供采样时间，横轴为采样序号。</span> : null}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
        <span className="text-sm font-semibold">规则预测</span>
        <Tooltip title={`${item.forecast.label}：${item.forecast.reason}（${item.forecast.source}）`}>
          <span className="rounded-md bg-[color-mix(in_srgb,var(--home-theme-text)_7%,transparent)] px-3 py-1.5 text-sm font-medium">{item.forecast.value}</span>
        </Tooltip>
        <span className={cn("text-[13px]", mutedText)}>非实时行情 · 不构成投资建议</span>
      </div>
    </div>
  );
}

function InvestmentPriceChart({ item }: { item: InvestmentWatchlistEntry }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const { token } = theme.useToken();
  const line = item.quote.changePercent === null || item.quote.changePercent === 0 ? token.colorTextSecondary : item.quote.changePercent > 0 ? token.colorError : token.colorSuccess;
  const option = useMemo(() => buildInvestmentChartOptions(item.trend, item.trendLabels ?? [], {
    text: token.colorTextSecondary, grid: token.colorSplit, background: token.colorBgElevated, line,
  }, item.instrumentType), [item.trend, item.trendLabels, item.instrumentType, token.colorTextSecondary, token.colorSplit, token.colorBgElevated, line]);

  useEffect(() => {
    if (!elementRef.current) return;
    const chart = echarts.init(elementRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(elementRef.current);
    return () => {
      observer.disconnect();
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return (
    <div aria-label={`${item.instrumentName}${item.instrumentType === "fund" ? "净值" : "分时价格"}趋势图`} className="relative mt-2 h-[clamp(280px,34vh,420px)] min-w-0" role="img">
      <div aria-hidden className={cn("h-full w-full", !item.trend.length && "invisible")} ref={elementRef} />
      {!item.trend.length ? <div className="absolute inset-0 flex items-center justify-center"><Empty description="走势待更新，暂不绘制曲线" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div> : <span className="sr-only">共 {item.trend.length} 个来源采样，起点 {item.trend[0]}，最新 {item.trend.at(-1)}。</span>}
    </div>
  );
}
