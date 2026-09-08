"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { cn } from "@/lib/utils";
import { HomeContentFullscreenButton } from "../home-content-fullscreen";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DragOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Popover,
  Segmented,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import * as echarts from "echarts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildInvestmentSearchRows,
  splitSearchHighlight,
} from "./investment-search-utils";
import type { InvestmentFilter } from "./investment-search-utils";
import type {
  InvestmentDashboardData,
  InvestmentRecommendation,
  InvestmentSearchResult,
  InvestmentSectorSignal,
  InvestmentWatchlistEntry,
} from "./investment-types";

type InvestmentDashboardProps = { initialData: InvestmentDashboardData };

type InvestmentInstrumentInput = {
  instrumentCode: string;
  instrumentName: string;
  instrumentType: "fund" | "stock";
};

type NotificationForm = {
  enabled: boolean;
  notifyOnRecommendation: boolean;
  notifyOnSignal: boolean;
  webhookUrl: string;
};

const filterOptions: Array<{ label: string; value: InvestmentFilter }> = [
  { label: "全部", value: "all" },
  { label: "基金", value: "fund" },
  { label: "股票", value: "stock" },
];

function formatChange(value: number | null) {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getChangeClass(value: number | null) {
  if (value === null || value === 0) return "text-[color:var(--home-theme-text)]";
  return value > 0 ? "text-red-500" : "text-emerald-600";
}

const investmentPanelClassName =
  "home-preview-panel rounded-xl border bg-[color-mix(in_srgb,var(--home-theme-bg)_18%,#ffffff_82%)] text-[color:var(--home-theme-text)] shadow-sm dark:bg-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)]";

const investmentMutedTextClassName =
  "text-[color-mix(in_srgb,var(--home-theme-text)_68%,transparent)]";

const investmentFaintTextClassName =
  "text-[color-mix(in_srgb,var(--home-theme-text)_56%,transparent)]";

const investmentInsetSurfaceClassName =
  "rounded-lg bg-[color-mix(in_srgb,var(--home-theme-bg)_28%,#ffffff_72%)] p-2 dark:bg-[color-mix(in_srgb,var(--home-theme-bg)_82%,#ffffff_18%)]";

/** 根据投资品种展示对应的 iconfont 图标。 */
function InvestmentInstrumentIcon({
  className,
  instrumentType,
}: {
  className?: string;
  instrumentType: "fund" | "stock";
}) {
  return (
    <CategoryIcon
      className={className}
      iconClassName="text-xl text-red-500"
      name={instrumentType === "fund" ? "icon-fund" : "icon-stock"}
    />
  );
}

/** 复用 ECharts 渲染微型行情趋势，空序列不会显示成真实走势。 */
function TrendChart({
  className,
  trend,
  value,
}: {
  className?: string;
  trend: number[];
  value: number | null;
}) {
  const chartElement = useRef<HTMLDivElement>(null);
  const stroke = value === null || value >= 0 ? "#e64f4f" : "#16a072";

  useEffect(() => {
    const element = chartElement.current;
    if (!element || !trend.length) return;

    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    chart.setOption({
      animation: false,
      grid: { bottom: 3, left: 1, right: 4, top: 3 },
      xAxis: { boundaryGap: false, show: false, type: "category" },
      yAxis: { show: false, type: "value" },
      series: [{ data: trend, lineStyle: { color: stroke, width: 2 }, showSymbol: false, smooth: true, type: "line" }],
      tooltip: { show: false },
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [stroke, trend]);

  if (!trend.length) {
    return <Typography.Text className={cn("text-[10px]", investmentFaintTextClassName, className)}>走势待更新</Typography.Text>;
  }

  return (
    <div aria-label="趋势图" className={cn("min-w-0", className)}>
      <div className="h-9 w-full @min-[720px]/investment-watchlist:h-11" ref={chartElement} />
      <div className={cn("flex justify-between text-[10px]", investmentFaintTextClassName)}>
        <span>起点</span><span>最新</span>
      </div>
    </div>
  );
}

/** 关注项可拖拽列表、推荐关注和市场信号的主工作台。 */
export function InvestmentDashboard({ initialData }: InvestmentDashboardProps) {
  const { message } = App.useApp();
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<InvestmentFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [creatingInstrumentCode, setCreatingInstrumentCode] = useState<string>();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [draggedId, setDraggedId] = useState<string>();
  const [searchResults, setSearchResults] = useState<InvestmentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    enabled: false,
    notifyOnRecommendation: false,
    notifyOnSignal: false,
    webhookUrl: "",
  });

  const visibleWatchlist = useMemo(() => {
    return data.watchlist.filter((item) =>
      filter === "all" || item.instrumentType === filter,
    );
  }, [data.watchlist, filter]);

  const visibleSearchResults = useMemo(
    () => buildInvestmentSearchRows(searchResults, data.watchlist, filter),
    [data.watchlist, filter, searchResults],
  );

  const refreshDashboard = useCallback(async (showSuccess = true) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/investment/dashboard?t=${Date.now()}`);
      if (!response.ok) throw new Error("refresh failed");
      setData((await response.json()) as InvestmentDashboardData);
      if (showSuccess) message.success("行情已刷新");
    } catch {
      message.error("行情刷新失败，保留最近可用数据");
    } finally {
      setIsRefreshing(false);
    }
  }, [message]);

  useEffect(() => {
    const searchKeyword = keyword.trim();
    if (!isSearchOpen || !searchKeyword) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(false);
      try {
        const response = await fetch(`/api/investment/search?q=${encodeURIComponent(searchKeyword)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const results = (await response.json()) as InvestmentSearchResult[];
        setSearchResults(results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSearchError(true);
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isSearchOpen, keyword]);

  useEffect(() => {
    if (!isNotificationOpen) return;
    void (async () => {
      try {
        const response = await fetch("/api/investment/notification");
        if (!response.ok) throw new Error("load failed");
        const saved = (await response.json()) as {
          enabled: boolean;
          notify_on_recommendation: boolean;
          notify_on_signal: boolean;
        } | null;
        if (saved) {
          setNotificationForm((current) => ({
            ...current,
            enabled: saved.enabled,
            notifyOnRecommendation: saved.notify_on_recommendation,
            notifyOnSignal: saved.notify_on_signal,
          }));
        }
      } catch {
        message.error("通知设置读取失败");
      }
    })();
  }, [isNotificationOpen, message]);

  async function saveOrder(nextItems: InvestmentWatchlistEntry[]) {
    const order = JSON.stringify(nextItems.map((item) => item.instrumentCode));
    setData((currentData) => ({
      ...currentData,
      watchlist: nextItems.map((item) => ({ ...item, instrumentOrder: order })),
    }));

    const response = await fetch("/api/investment", {
      body: JSON.stringify({ instrument_order: order }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    if (!response.ok) {
      message.error("排序保存失败");
      void refreshDashboard(false);
    }
  }

  function moveDraggedItem(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const currentItems = data.watchlist;
    const fromIndex = currentItems.findIndex((item) => item.id === draggedId);
    const targetIndex = currentItems.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const nextItems = [...currentItems];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    if (!movedItem) return;
    nextItems.splice(targetIndex, 0, movedItem);
    void saveOrder(nextItems);
  }

  async function removeWatchlistItem(id: string) {
    const response = await fetch("/api/investment", {
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    if (!response.ok) {
      message.error("移除关注失败");
      return;
    }
    await saveOrder(data.watchlist.filter((item) => item.id !== id));
  }

  /** 将搜索结果或推荐项加入当前用户的关注列表。 */
  async function createWatchlistItem(nextItem: InvestmentInstrumentInput) {
    setCreatingInstrumentCode(nextItem.instrumentCode);
    try {
      const response = await fetch("/api/investment", {
        body: JSON.stringify({
          instrument_code: nextItem.instrumentCode,
          instrument_name: nextItem.instrumentName,
          instrument_type: nextItem.instrumentType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "create failed");
      message.success("已加入我的关注");
      await refreshDashboard(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "添加关注失败");
    } finally {
      setCreatingInstrumentCode(undefined);
    }
  }

  function addRecommendation(item: InvestmentRecommendation) {
    if (data.watchlist.some((watchlistItem) => watchlistItem.instrumentCode === item.instrumentCode)) {
      message.info("该项目已在我的关注中");
      return;
    }
    void createWatchlistItem({
      instrumentCode: item.instrumentCode,
      instrumentName: item.instrumentName,
      instrumentType: item.instrumentType,
    });
  }

  async function saveNotification() {
    setIsSavingNotification(true);
    try {
      const response = await fetch("/api/investment/notification", {
        body: JSON.stringify({
          enabled: notificationForm.enabled,
          notify_on_recommendation: notificationForm.notifyOnRecommendation,
          notify_on_signal: notificationForm.notifyOnSignal,
          webhook_url: notificationForm.webhookUrl,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "save failed");
      setIsNotificationOpen(false);
      setNotificationForm((current) => ({ ...current, webhookUrl: "" }));
      message.success("企微通知设置已保存");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "通知设置保存失败");
    } finally {
      setIsSavingNotification(false);
    }
  }

  const searchStatusText = isSearching
    ? "正在搜索"
    : searchError
      ? "搜索失败"
      : visibleSearchResults.length
        ? `找到 ${visibleSearchResults.length} 个结果`
        : "未找到匹配结果";
  const searchPopoverContent = (
    <div
      aria-busy={isSearching}
      aria-label="模糊搜索结果"
      className="w-[min(360px,calc(100vw-32px))]"
      id="investment-search-results"
      role="region"
    >
      <span aria-live="polite" className="sr-only">
        {searchStatusText}
      </span>
      {isSearching ? (
        <div className="flex min-h-24 items-center justify-center">
          <Spin size="small" />
        </div>
      ) : searchError ? (
        <Typography.Text className="block px-4 py-6 text-center text-red-500">
          搜索失败，请稍后重试
        </Typography.Text>
      ) : visibleSearchResults.length ? (
        <ul className="home-preview-divide-y m-0 max-h-80 list-none divide-y overflow-y-auto p-0">
          {visibleSearchResults.map((item) => (
            <li
              className="flex items-center gap-3 px-4 py-3"
              key={`${item.instrumentType}-${item.instrumentCode}`}
            >
              <InvestmentInstrumentIcon className="size-7 shrink-0" instrumentType={item.instrumentType} />
              <div className="min-w-0 flex-1">
                <Typography.Text className="block truncate" strong>
                  {splitSearchHighlight(item.instrumentName, keyword).map((segment, index) =>
                    segment.highlighted ? (
                      <mark
                        className="rounded-sm bg-red-50 px-0.5 text-red-500 dark:bg-red-950/50"
                        key={`${segment.text}-${index}`}
                      >
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={`${segment.text}-${index}`}>{segment.text}</span>
                    ),
                  )}
                </Typography.Text>
                <Typography.Text className={cn("block truncate text-xs tabular-nums", investmentMutedTextClassName)}>
                  {splitSearchHighlight(item.instrumentCode, keyword).map((segment, index) =>
                    segment.highlighted ? (
                      <mark
                        className="rounded-sm bg-red-50 px-0.5 text-red-500 dark:bg-red-950/50"
                        key={`${segment.text}-${index}`}
                      >
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={`${segment.text}-${index}`}>{segment.text}</span>
                    ),
                  )}
                  {` · ${item.instrumentType === "fund" ? "基金" : "股票"}`}
                </Typography.Text>
              </div>
              {item.isWatched ? (
                <span
                  aria-label={`${item.instrumentName} 已关注`}
                  className={cn("flex shrink-0 flex-col items-center gap-0.5 text-[10px]", investmentFaintTextClassName)}
                >
                  <CheckCircleOutlined aria-hidden className="text-base" />
                  <span>已关注</span>
                </span>
              ) : (
                <Tooltip title="添加到关注">
                  <Button
                    aria-label={`添加 ${item.instrumentName} 到关注`}
                    color="danger"
                    disabled={Boolean(creatingInstrumentCode)}
                    icon={<PlusOutlined />}
                    loading={creatingInstrumentCode === item.instrumentCode}
                    onClick={() => void createWatchlistItem(item)}
                    shape="circle"
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          className="m-0 py-5"
          description="没有匹配的基金或股票"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );

  return (
    <section
      className="investment-dashboard-shell flex min-h-0 w-full flex-1 flex-col gap-4"
      data-investment-dashboard
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon
            className="size-7"
            iconClassName="text-xl text-red-500"
            name="icon-investment"
          />
          <Typography.Title className="m-0! text-[22px]! max-sm:text-xl!" level={2}>今日市场信号</Typography.Title>
          <HomeContentFullscreenButton />
          <Tag className="m-0 border-0 bg-emerald-50 px-2 py-1 text-emerald-700">{data.marketStateLabel}</Tag>
        </div>
        <div className={cn("flex items-center gap-1 text-xs", investmentMutedTextClassName)}>
          <span>公开行情 · 更新于 {data.dataUpdatedAt}</span>
          <Tooltip title="手动刷新"><Button aria-label="手动刷新" icon={<ReloadOutlined />} loading={isRefreshing} onClick={() => void refreshDashboard()} type="text" /></Tooltip>
          <Tooltip title="通知设置"><Button aria-label="通知设置" icon={<SettingOutlined />} onClick={() => { setNotificationForm({ enabled: false, notifyOnRecommendation: false, notifyOnSignal: false, webhookUrl: "" }); setIsNotificationOpen(true); }} type="text" /></Tooltip>
        </div>
      </header>

      <div className="investment-dashboard-grid grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 max-[1180px]:grid-cols-1">
        <section className={cn("investment-watchlist-panel @container/investment-watchlist flex min-h-0 flex-col p-4", investmentPanelClassName)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Typography.Title className="m-0! text-lg!" level={3}>我的关注</Typography.Title><Typography.Text className={investmentMutedTextClassName}>({data.watchlist.length})</Typography.Text></div>
            <Popover
              content={searchPopoverContent}
              destroyOnHidden
              onOpenChange={(open) => {
                setIsSearchOpen(open);
                if (!open) setIsSearching(false);
              }}
              open={isSearchOpen && Boolean(keyword.trim())}
              placement="bottomRight"
              styles={{ content: { padding: 0 } }}
              trigger="click"
            >
              <div className="min-w-0 flex-1 sm:w-[360px] sm:flex-none">
                <Input
                  allowClear
                  aria-controls="investment-search-results"
                  aria-expanded={isSearchOpen && Boolean(keyword.trim())}
                  aria-label="搜索基金或股票"
                  className="min-w-0"
                  id="investment-search-input"
                  name="investmentSearch"
                  onChange={(event) => {
                    const nextKeyword = event.target.value;
                    setKeyword(nextKeyword);
                    setSearchResults([]);
                    setIsSearching(false);
                    setSearchError(false);
                    setIsSearchOpen(Boolean(nextKeyword.trim()));
                  }}
                  onFocus={() => {
                    if (keyword.trim()) setIsSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setIsSearchOpen(false);
                  }}
                  placeholder="搜索代码/名称"
                  prefix={<SearchOutlined aria-hidden />}
                  value={keyword}
                />
              </div>
            </Popover>
          </div>
          <Segmented className="mt-3 w-fit" onChange={(value) => setFilter(value as InvestmentFilter)} options={filterOptions} value={filter} />
          <div className={cn("home-preview-divider mt-4 hidden grid-cols-[minmax(0,1.15fr)_82px_114px_minmax(0,.8fr)_30px] gap-2 border-b pb-2 text-xs @min-[720px]/investment-watchlist:grid", investmentMutedTextClassName)}>
            <span>代码 / 名称</span><span>今日涨跌</span><span>下一交易日预测</span><span>趋势</span><span />
          </div>
          <OverlayScrollArea className="min-h-0 flex-1" viewportClassName="overflow-x-hidden" vertical>
            {visibleWatchlist.length ? <div>{visibleWatchlist.map((item) => <WatchlistRow key={item.id} item={item} onDragEnd={() => setDraggedId(undefined)} onDragStart={() => setDraggedId(item.id)} onDrop={() => moveDraggedItem(item.id)} onRemove={() => void removeWatchlistItem(item.id)} />)}</div> : <Empty className="mt-18" description="还没有匹配的关注项" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </OverlayScrollArea>
        </section>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <RecommendationPanel items={data.recommended} onAdd={addRecommendation} />
          <MarketSignalPanel items={data.sectors} />
        </div>
      </div>

      <EvidenceStrip evidence={data.evidence} />

      <Drawer destroyOnHidden footer={<Button loading={isSavingNotification} onClick={() => void saveNotification()} type="primary">保存设置</Button>} onClose={() => setIsNotificationOpen(false)} open={isNotificationOpen} title="企微机器人通知" width={400}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4"><Typography.Text>启用推送</Typography.Text><Switch checked={notificationForm.enabled} onChange={(enabled) => setNotificationForm((current) => ({ ...current, enabled }))} /></div>
          <Input onChange={(event) => setNotificationForm((current) => ({ ...current, webhookUrl: event.target.value }))} placeholder="粘贴企微机器人 Webhook 链接" value={notificationForm.webhookUrl} />
          <div className="flex items-center justify-between gap-4"><div><Typography.Text>推荐关注出现</Typography.Text><Typography.Text className="block text-xs" type="secondary">规则模型输出三条候选时推送</Typography.Text></div><Switch checked={notificationForm.notifyOnRecommendation} onChange={(notifyOnRecommendation) => setNotificationForm((current) => ({ ...current, notifyOnRecommendation }))} /></div>
          <div className="flex items-center justify-between gap-4"><div><Typography.Text>板块信号偏涨或偏弱</Typography.Text><Typography.Text className="block text-xs" type="secondary">方向判断发生时推送</Typography.Text></div><Switch checked={notificationForm.notifyOnSignal} onChange={(notifyOnSignal) => setNotificationForm((current) => ({ ...current, notifyOnSignal }))} /></div>
          <Typography.Text type="secondary">Webhook 仅保存在服务端，页面再次打开时不会回显完整地址。</Typography.Text>
        </div>
      </Drawer>
    </section>
  );
}

function WatchlistRow({
  item,
  onDragEnd,
  onDragStart,
  onDrop,
  onRemove,
}: {
  item: InvestmentWatchlistEntry;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="home-preview-divider flex flex-col gap-3 border-b py-4 last:border-b-0 @min-[720px]/investment-watchlist:grid @min-[720px]/investment-watchlist:grid-cols-[minmax(0,1.15fr)_82px_114px_minmax(0,.8fr)_30px] @min-[720px]/investment-watchlist:items-center @min-[720px]/investment-watchlist:gap-2"
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 items-start gap-2 @min-[720px]/investment-watchlist:items-center">
        <DragOutlined className={cn("mt-1 cursor-grab @min-[720px]/investment-watchlist:mt-0", investmentFaintTextClassName)} />
        <InvestmentInstrumentIcon
          className="size-7"
          instrumentType={item.instrumentType}
        />
        <div className="min-w-0 flex-1">
          <Typography.Text className="block truncate" strong>
            {item.instrumentName}
          </Typography.Text>
          <Typography.Text className={cn("text-xs", investmentMutedTextClassName)}>
            {item.instrumentCode} · {item.instrumentType === "fund" ? "基金" : "股票"}
          </Typography.Text>
        </div>
        <Popconfirm
          cancelText="取消"
          okText="移除"
          onConfirm={onRemove}
          title="移除此关注项？"
        >
          <Button
            aria-label={`删除 ${item.instrumentName}`}
            className="shrink-0 @min-[720px]/investment-watchlist:hidden"
            icon={<DeleteOutlined />}
            size="small"
            type="text"
          />
        </Popconfirm>
      </div>
      <div className="grid grid-cols-2 gap-2 @min-[720px]/investment-watchlist:contents">
        <MetricCell
          className={cn(investmentInsetSurfaceClassName, "@min-[720px]/investment-watchlist:rounded-none @min-[720px]/investment-watchlist:bg-transparent @min-[720px]/investment-watchlist:p-0")}
          detail={`${item.quote.source}${item.quote.updatedAt ? ` · ${item.quote.updatedAt}` : ""}`}
          label="今日涨跌"
          labelClassName="mr-2 text-xs @min-[720px]/investment-watchlist:hidden"
          value={formatChange(item.quote.changePercent)}
          valueClassName={getChangeClass(item.quote.changePercent)}
        />
        <MetricCell
          className={cn(investmentInsetSurfaceClassName, "@min-[720px]/investment-watchlist:rounded-none @min-[720px]/investment-watchlist:bg-transparent @min-[720px]/investment-watchlist:p-0")}
          detail={item.forecast.label}
          label="下一交易日预测"
          labelClassName="mr-2 text-xs @min-[720px]/investment-watchlist:hidden"
          value={item.forecast.value}
          valueClassName={
            item.forecast.value.includes("-") || item.forecast.value === "偏弱"
              ? "text-emerald-600"
              : "text-red-500"
          }
        />
      </div>
      <TrendChart
        className={cn(investmentInsetSurfaceClassName, "@min-[720px]/investment-watchlist:rounded-none @min-[720px]/investment-watchlist:bg-transparent @min-[720px]/investment-watchlist:p-0")}
        trend={item.trend}
        value={item.quote.changePercent}
      />
      <Popconfirm
        cancelText="取消"
        okText="移除"
        onConfirm={onRemove}
        title="移除此关注项？"
      >
        <Button
          aria-label={`删除 ${item.instrumentName}`}
          className="hidden justify-self-end @min-[720px]/investment-watchlist:inline-flex"
          icon={<DeleteOutlined />}
          size="small"
          type="text"
        />
      </Popconfirm>
    </div>
  );
}

function MetricCell({
  className,
  detail,
  label,
  labelClassName,
  value,
  valueClassName,
}: {
  className?: string;
  detail: string;
  label: string;
  labelClassName?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={className}>
      <Typography.Text
        className={cn(
          "mr-2 text-xs",
          investmentMutedTextClassName,
          labelClassName ?? "min-[720px]:hidden",
        )}
      >
        {label}
      </Typography.Text>
      <Typography.Text className={cn("font-semibold", valueClassName)}>
        {value}
      </Typography.Text>
      <Typography.Text className={cn("mt-0.5 block truncate text-[10px]", investmentFaintTextClassName)}>
        {detail}
      </Typography.Text>
    </div>
  );
}

function RecommendationPanel({
  items,
  onAdd,
}: {
  items: InvestmentRecommendation[];
  onAdd: (item: InvestmentRecommendation) => void;
}) {
  return (
    <section className={cn(investmentPanelClassName, "p-4")}>
      <div className="flex items-center gap-2">
        <Typography.Title className="m-0! text-lg!" level={3}>
          推荐关注
        </Typography.Title>
        <Tag className="m-0 rounded-full border-0 bg-emerald-50 text-emerald-700">
          {items.length}
        </Tag>
      </div>
      <Typography.Text className={cn("mt-1 block text-xs", investmentMutedTextClassName)}>
        基金展示下一交易日估计；股票只展示方向判断。
      </Typography.Text>
      <div className="home-preview-divide-y mt-2 divide-y">
        {items.map((item) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3"
            key={item.instrumentCode}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <InvestmentInstrumentIcon instrumentType={item.instrumentType} />
                <Typography.Text className="truncate" strong>
                  {item.instrumentName}
                </Typography.Text>
              </div>
              <Typography.Text className={cn("ml-8 block truncate text-xs", investmentMutedTextClassName)}>
                {item.instrumentCode} · {item.reason}
              </Typography.Text>
            </div>
            <div className="text-right">
              <Typography.Text
                className={cn("font-semibold", getChangeClass(item.changePercent))}
              >
                {formatChange(item.changePercent)}
              </Typography.Text>
              <Typography.Text
                className={cn(
                  "ml-2 text-sm font-semibold",
                  item.forecast.includes("-") ? "text-emerald-600" : "text-red-500",
                )}
              >
                {item.forecast}
              </Typography.Text>
              <div className={cn("text-[10px]", investmentFaintTextClassName)}>
                {item.source}
                {item.updatedAt ? ` · ${item.updatedAt}` : ""}
              </div>
            </div>
            <Button onClick={() => onAdd(item)} size="small">
              加入关注
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketSignalPanel({ items }: { items: InvestmentSectorSignal[] }) {
  return (
    <section className={cn(investmentPanelClassName, "flex min-h-0 flex-col p-4")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Typography.Title className="m-0! text-lg!" level={3}>
          市场信号地图
        </Typography.Title>
        <Typography.Text className={investmentMutedTextClassName}>
          下一交易日判断
        </Typography.Text>
      </div>
      <OverlayScrollArea
        className="mt-3 min-h-0 flex-1"
        viewportClassName="overflow-x-hidden"
        vertical
      >
        <div className="home-preview-divide-y divide-y">
          {items.map((item) => (
            <div
              className="flex flex-col gap-2 py-3 min-[760px]:grid min-[760px]:grid-cols-[minmax(108px,.7fr)_72px_100px_minmax(80px,.65fr)_minmax(0,1.1fr)] min-[760px]:items-center min-[760px]:gap-3"
              key={item.name}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div aria-label="板块图标预留" className="size-6 shrink-0" />
                <Typography.Text className="truncate" strong>
                  {item.name}
                </Typography.Text>
              </div>
              <MetricCell
                detail={item.isLive ? item.source : "等待公开行情"}
                label="今日涨跌"
                value={formatChange(item.changePercent)}
                valueClassName={getChangeClass(item.changePercent)}
              />
              <MetricCell
                detail="下一交易日"
                label="规则判断"
                value={`${item.direction}${item.forecastPercent === undefined ? "" : ` ${formatChange(item.forecastPercent)}`}`}
                valueClassName={
                  item.direction === "偏弱"
                    ? "text-emerald-600"
                    : item.direction === "偏涨"
                      ? "text-red-500"
                      : undefined
                }
              />
              <TrendChart trend={item.trend} value={item.changePercent} />
              <Typography.Text className={cn("line-clamp-2 text-xs", investmentMutedTextClassName)}>
                {item.reason}
                {item.updatedAt ? ` · ${item.updatedAt}` : ""}
              </Typography.Text>
            </div>
          ))}
        </div>
      </OverlayScrollArea>
    </section>
  );
}

function EvidenceStrip({ evidence }: { evidence: InvestmentDashboardData["evidence"] }) {
  const fetched = evidence.filter((item) => item.status === "fetched");
  const failed = evidence.filter((item) => item.status === "failed");
  const signalScore = fetched.reduce((total, item) => total + item.signalScore, 0);
  return (
    <section className={cn(investmentPanelClassName, "flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm")}>
      <Typography.Text strong>信号依据</Typography.Text>
      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
        规则 MD
      </span>
      <Typography.Text className={investmentMutedTextClassName}>
        {fetched.length ? `已抓取 ${fetched.map((item) => item.title).join("、")}` : "等待公开来源响应"}
      </Typography.Text>
      {fetched.length ? (
        <Typography.Text className={investmentMutedTextClassName}>
          文本信号 {signalScore > 0 ? "偏涨" : signalScore < 0 ? "偏弱" : "中性"}
        </Typography.Text>
      ) : null}
      {failed.length ? (
        <Typography.Text className="text-amber-700 dark:text-amber-300">
          抓取失败 {failed.length} 个
        </Typography.Text>
      ) : null}
    </section>
  );
}
