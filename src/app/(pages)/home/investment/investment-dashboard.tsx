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
import { formatInvestmentPrice, getInvestmentNextRefreshDelay, getInvestmentQuoteLabel, getInvestmentRefreshInterval, getInvestmentSectorState, getSelectedInvestmentEntry, mergeInvestmentDashboard, mergeInvestmentQuotes, resolveInvestmentSelection } from "./investment-utils";
import { InvestmentDetailPanel } from "./investment-detail-panel";
import type {
  InvestmentDashboardData,
  InvestmentRecommendation,
  InvestmentQuoteSnapshot,
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
  { label: "股票", value: "stock" },
  { label: "基金", value: "fund" },
];

function formatChange(value: number | null) {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getChangeClass(value: number | null) {
  if (value === null || value === 0) return "text-[color:var(--home-theme-text)]";
  return value > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
}

const investmentPanelClassName =
  "home-preview-panel rounded-xl border bg-[color-mix(in_srgb,var(--home-theme-bg)_18%,#ffffff_82%)] text-[color:var(--home-theme-text)] shadow-sm dark:bg-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)]";

const investmentMutedTextClassName =
  "text-[color-mix(in_srgb,var(--home-theme-text)_82%,transparent)]";

const investmentFaintTextClassName =
  "text-[color-mix(in_srgb,var(--home-theme-text)_72%,transparent)]";

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

/** 关注项可拖拽列表、推荐关注和市场信号的主工作台。 */
export function InvestmentDashboard({ initialData }: InvestmentDashboardProps) {
  const { message } = App.useApp();
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<InvestmentFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const refreshController = useRef<AbortController | null>(null);
  const lastFullRefreshAt = useRef(0);
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
  const [selection, setSelection] = useState(() => resolveInvestmentSelection(initialData.watchlist, {}));
  const [connectionStatus, setConnectionStatus] = useState<"active" | "hidden" | "offline">("active");
  const resolvedSelection = resolveInvestmentSelection(data.watchlist, selection);
  if (resolvedSelection.all !== selection.all || resolvedSelection.stock !== selection.stock || resolvedSelection.fund !== selection.fund) {
    setSelection(resolvedSelection);
  }
  const selectedId = resolvedSelection[filter];
  const selectedItem = useMemo(() => getSelectedInvestmentEntry(data.watchlist, filter, selectedId), [data.watchlist, filter, selectedId]);
  const interval = getInvestmentRefreshInterval();
  const refreshLabel = connectionStatus === "offline" ? "离线，自动检查已暂停" : connectionStatus === "hidden" ? "后台暂停自动检查" : interval === 15_000 ? "前台每 15 秒检查" : interval === 60_000 ? "收盘后每分钟检查" : "休市时每 5 分钟检查";
  const feedNotice = connectionStatus === "offline" ? "当前已离线，自动检查已暂停；保留最近行情，联网后立即重新检查。" : connectionStatus === "hidden" ? "页面在后台，自动检查已暂停；返回前台后立即重新检查。" : refreshError ? "刷新失败，正在保留上次数据并自动重试。" : undefined;

  const visibleWatchlist = useMemo(() => {
    return data.watchlist.filter((item) =>
      filter === "all" || item.instrumentType === filter,
    );
  }, [data.watchlist, filter]);

  const visibleSearchResults = useMemo(
    () => buildInvestmentSearchRows(searchResults, data.watchlist, filter),
    [data.watchlist, filter, searchResults],
  );

  const refreshDashboard = useCallback(async (showSuccess = true, quotesOnly = false) => {
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    if (!quotesOnly) lastFullRefreshAt.current = Date.now();
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/investment/dashboard?mode=${quotesOnly ? "quotes" : "full"}&t=${Date.now()}`, {
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!response.ok) throw new Error("refresh failed");
      const next = await response.json();
      if (controller.signal.aborted) return;
      if (quotesOnly) {
        setData(current => mergeInvestmentQuotes(current, next as InvestmentQuoteSnapshot));
      } else {
        setData(current => mergeInvestmentDashboard(current, next as InvestmentDashboardData));
      }
      setRefreshError(false);
      if (showSuccess) message.success("已检查最新行情");
    } catch {
      if (!controller.signal.aborted) {
        setRefreshError(true);
        if (showSuccess) message.error("行情刷新失败，保留最近可用数据");
      }
    } finally {
      if (refreshController.current === controller) {
        refreshController.current = null;
        setIsRefreshing(false);
      }
    }
  }, [message]);

  useEffect(() => {
    let disposed = false;
    lastFullRefreshAt.current = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const isPageActive = () => document.visibilityState !== "hidden" && navigator.onLine;
    const syncConnectionStatus = () => setConnectionStatus(!navigator.onLine ? "offline" : document.visibilityState === "hidden" ? "hidden" : "active");
    const tick = async () => {
      if (disposed || !isPageActive()) return;
      const startedAt = Date.now();
      if (!refreshController.current) {
        await refreshDashboard(false, Date.now() - lastFullRefreshAt.current < 300_000);
      }
      if (!disposed && isPageActive()) {
        clearTimeout(timer);
        timer = setTimeout(() => void tick(), Math.max(1000, getInvestmentNextRefreshDelay(new Date(startedAt)) - (Date.now() - startedAt)));
      }
    };
    const resume = () => {
      if (disposed) return;
      clearTimeout(timer);
      syncConnectionStatus();
      if (!isPageActive()) {
        refreshController.current?.abort();
        return;
      }
      void tick();
    };
    void Promise.resolve().then(() => {
      if (disposed) return;
      syncConnectionStatus();
      void tick();
    });
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    return () => {
      disposed = true;
      clearTimeout(timer);
      refreshController.current?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [refreshDashboard]);

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
    refreshController.current?.abort();
    const order = JSON.stringify(nextItems.map((item) => `${item.instrumentType}:${item.instrumentCode}`));
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

  function moveDraggedItem(targetId: string, sourceId = draggedId) {
    if (!sourceId || sourceId === targetId) return;
    const currentItems = data.watchlist;
    const fromIndex = currentItems.findIndex((item) => item.id === sourceId);
    const targetIndex = currentItems.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const nextItems = [...currentItems];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    if (!movedItem) return;
    nextItems.splice(targetIndex, 0, movedItem);
    void saveOrder(nextItems);
  }

  async function removeWatchlistItem(id: string) {
    refreshController.current?.abort();
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
    refreshController.current?.abort();
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
    if (data.watchlist.some((watchlistItem) => watchlistItem.instrumentCode === item.instrumentCode && watchlistItem.instrumentType === item.instrumentType)) {
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
      className="investment-dashboard-shell flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden"
      data-investment-dashboard
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon
            className="size-7"
            iconClassName="text-xl text-red-500"
            name="icon-investment"
          />
          <Typography.Title className="m-0! text-2xl! max-sm:text-xl!" level={2}>投资</Typography.Title>
          <span className={cn("hidden text-sm sm:inline", investmentMutedTextClassName)}>股票与基金 · 我的关注</span>
          <HomeContentFullscreenButton />
        </div>
        <div className={cn("flex flex-wrap items-center gap-3 text-[13px]", investmentMutedTextClassName)}>
          <Tag className="m-0!" color={connectionStatus !== "active" ? "warning" : data.marketState === "trading" ? "success" : "default"}>{connectionStatus === "offline" ? "离线" : connectionStatus === "hidden" ? "后台已暂停" : data.marketStateLabel}</Tag>
          <Tooltip title={`公开行情 · 最近检查 ${data.quotesCheckedAt}`}><span className="hidden tabular-nums xl:inline">最近检查 {data.quotesCheckedAt.split(" ")[1] ?? data.quotesCheckedAt}</span></Tooltip>
          <Button aria-label="手动刷新" disabled={connectionStatus === "offline"} icon={<ReloadOutlined />} loading={isRefreshing} onClick={() => void refreshDashboard()}>刷新</Button>
          <Tooltip title="通知设置"><Button aria-label="通知设置" icon={<SettingOutlined />} onClick={() => { setNotificationForm({ enabled: false, notifyOnRecommendation: false, notifyOnSignal: false, webhookUrl: "" }); setIsNotificationOpen(true); }} type="text" /></Tooltip>
        </div>
      </header>

      <OverlayScrollArea aria-label="投资工作区" className="@container/investment-workspace min-h-0 flex-1" role="region" viewportClassName="overflow-x-hidden [scrollbar-gutter:stable]" vertical>
        <div className="flex min-w-0 flex-col gap-4 pb-1">
          {feedNotice ? <div aria-live="polite" className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300" role="status">{feedNotice}</div> : null}
          <div className="investment-dashboard-grid grid min-w-0 grid-cols-1 items-stretch gap-4 @min-[900px]/investment-workspace:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
            <section aria-label="我的关注列表" className={cn("investment-watchlist-panel min-w-0 overflow-hidden", investmentPanelClassName)}>
              <div className="home-preview-divider border-b p-4">
                <div className="mb-3 flex items-center gap-2"><Typography.Title className="m-0! text-lg!" level={3}>我的关注</Typography.Title><span className={cn("tabular-nums", investmentMutedTextClassName)}>{data.watchlist.length}</span></div>
                <Popover
                  content={searchPopoverContent}
                  destroyOnHidden
                  onOpenChange={(open) => {
                    setIsSearchOpen(open);
                    if (!open) setIsSearching(false);
                  }}
                  open={isSearchOpen && Boolean(keyword.trim())}
                  placement="bottomLeft"
                  styles={{ content: { padding: 0 } }}
                  trigger="click"
                >
                  <div className="min-w-0 w-full">
                    <Input
                      allowClear
                      aria-controls="investment-search-results"
                      aria-expanded={isSearchOpen && Boolean(keyword.trim())}
                      aria-label="搜索基金或股票"
                      className="min-w-0 h-10"
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
                <Segmented block className="mt-3" onChange={(value) => setFilter(value as InvestmentFilter)} options={filterOptions.map(option => ({ ...option, label: `${option.label} ${data.watchlist.filter(item => option.value === "all" || item.instrumentType === option.value).length}` }))} value={filter} />
              </div>
              {visibleWatchlist.length ? (
                <ul className="m-0 list-none p-0">
                  {visibleWatchlist.map((item, index) => (
                    <WatchlistRow
                      key={item.id}
                      item={item}
                      selected={selectedItem?.id === item.id}
                      onSelect={() => setSelection(current => ({ ...current, all: item.id, [filter]: item.id, [item.instrumentType]: item.id }))}
                      onDragEnd={() => setDraggedId(undefined)}
                      onDragStart={() => setDraggedId(item.id)}
                      onDrop={() => moveDraggedItem(item.id)}
                      onRemove={() => void removeWatchlistItem(item.id)}
                      onMove={(offset) => {
                        const target = visibleWatchlist[index + offset];
                        if (target) moveDraggedItem(target.id, item.id);
                      }}
                    />
                  ))}
                </ul>
              ) : <Empty className="my-12" description={data.watchlist.length ? "此分类暂无关注项" : "搜索代码或名称，添加第一个关注"} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </section>

            <section aria-label="标的行情详情" id="investment-selected-detail" className={cn("investment-detail-panel min-w-0 overflow-hidden", investmentPanelClassName)}>
              <InvestmentDetailPanel item={selectedItem} changeLabel={formatChange(selectedItem?.quote.changePercent ?? null)} changeClassName={getChangeClass(selectedItem?.quote.changePercent ?? null)} refreshLabel={refreshLabel} />
            </section>
          </div>

          <div className={cn("investment-discovery-panel grid min-w-0 grid-cols-1 gap-5 p-5 @min-[1000px]/investment-workspace:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]", investmentPanelClassName)}>
            <MarketSignalPanel items={data.sectors} />
            <RecommendationPanel items={data.recommended} watchlist={data.watchlist} creatingInstrumentCode={creatingInstrumentCode} onAdd={addRecommendation} />
          </div>

          <EvidenceStrip evidence={data.evidence} />
          <div className={cn("flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px]", investmentMutedTextClassName)}>
            <span>{refreshLabel}；基金盘中估值与正式净值分别标注。</span>
            <Tooltip title={`市场信号与候选规则每 5 分钟检查，最近检查 ${data.dataUpdatedAt}`}><span>市场信号每 5 分钟检查</span></Tooltip>
            <span>规则判断不构成投资建议。</span>
          </div>
        </div>
      </OverlayScrollArea>

      <Drawer destroyOnHidden footer={<Button loading={isSavingNotification} onClick={() => void saveNotification()} type="primary">保存设置</Button>} onClose={() => setIsNotificationOpen(false)} open={isNotificationOpen} size={400} title="企微机器人通知">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4"><Typography.Text>启用推送</Typography.Text><Switch checked={notificationForm.enabled} onChange={(enabled) => setNotificationForm((current) => ({ ...current, enabled }))} /></div>
          <Input aria-label="企微机器人 Webhook 链接" onChange={(event) => setNotificationForm((current) => ({ ...current, webhookUrl: event.target.value }))} placeholder="粘贴企微机器人 Webhook 链接" value={notificationForm.webhookUrl} />
          <div className="flex items-center justify-between gap-4"><div><Typography.Text>推荐关注出现</Typography.Text><Typography.Text className="block text-xs" type="secondary">规则模型输出三条候选时推送</Typography.Text></div><Switch checked={notificationForm.notifyOnRecommendation} onChange={(notifyOnRecommendation) => setNotificationForm((current) => ({ ...current, notifyOnRecommendation }))} /></div>
          <div className="flex items-center justify-between gap-4"><div><Typography.Text>板块信号偏涨或偏弱</Typography.Text><Typography.Text className="block text-xs" type="secondary">方向判断发生时推送</Typography.Text></div><Switch checked={notificationForm.notifyOnSignal} onChange={(notifyOnSignal) => setNotificationForm((current) => ({ ...current, notifyOnSignal }))} /></div>
          <Typography.Text type="secondary">Webhook 仅保存在服务端，页面再次打开时不会回显完整地址。</Typography.Text>
        </div>
      </Drawer>
    </section>
  );
}

function WatchlistRow({
  item, selected, onSelect, onDragEnd, onDragStart, onDrop, onRemove, onMove,
}: {
  item: InvestmentWatchlistEntry;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onRemove: () => void;
  onMove: (offset: number) => void;
}) {
  const timeLabel = item.quote.kind === "nav" ? "净值日期" : item.instrumentType === "fund" ? "估值时间" : "行情时间";
  return (
    <li
      className={cn("home-preview-divider relative flex min-w-0 border-b last:border-b-0", selected && "bg-[color-mix(in_srgb,var(--home-theme-color)_10%,transparent)]")}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      {selected ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-[color:var(--home-theme-color)]" /> : null}
      <button
        aria-controls="investment-selected-detail"
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        aria-label={`查看 ${item.instrumentName} 行情`}
        aria-pressed={selected}
        className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-4 pl-4 pr-1 text-left text-inherit hover:bg-[color-mix(in_srgb,var(--home-theme-text)_4%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--home-theme-color)]"
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            onMove(event.key === "ArrowUp" ? -1 : 1);
          }
        }}
        type="button"
      >
        <span className="flex min-w-0 items-start justify-between gap-3">
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold leading-6 [overflow-wrap:anywhere]">{item.instrumentName}</strong>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn("text-[13px] tabular-nums", investmentMutedTextClassName)}>{item.instrumentCode}</span>
              <Tag className="m-0! text-xs!" color={item.instrumentType === "stock" ? "blue" : "gold"}>{item.instrumentType === "stock" ? "股票" : "基金"}</Tag>
            </span>
          </span>
          <span className="shrink-0 text-right tabular-nums">
            <span className="block text-xl font-semibold leading-7">{formatInvestmentPrice(item.quote, item.instrumentType)}</span>
            <span className={cn("mt-1 block text-lg font-semibold leading-6", getChangeClass(item.quote.changePercent))}>{formatChange(item.quote.changePercent)}</span>
          </span>
        </span>
        <Tooltip title={item.quote.source}>
          <span className={cn("mt-2 block text-[13px] leading-5", investmentMutedTextClassName)}>
            {getInvestmentQuoteLabel(item.quote)} · {timeLabel} {item.quote.updatedAt ? <time dateTime={`${item.quote.updatedAt.replace(" ", "T")}+08:00`}>{item.quote.updatedAt.replace(" 00:00:00", "")}</time> : "待更新"}
          </span>
        </Tooltip>
      </button>
      <div className="flex w-8 shrink-0 flex-col items-center justify-center gap-2 pr-2">
        <Tooltip title="拖动排序；键盘选中后 Alt + ↑ / ↓ 调整顺序">
          <DragOutlined aria-hidden className={cn("cursor-grab text-xs", investmentFaintTextClassName)} />
        </Tooltip>
        <Popconfirm cancelText="取消" okText="移除" onConfirm={onRemove} title="移除此关注项？">
          <Button aria-label={`删除 ${item.instrumentName}`} icon={<DeleteOutlined />} size="small" type="text" />
        </Popconfirm>
      </div>
    </li>
  );
}

function RecommendationPanel({
  items, watchlist, creatingInstrumentCode, onAdd,
}: {
  items: InvestmentRecommendation[];
  watchlist: InvestmentWatchlistEntry[];
  creatingInstrumentCode?: string;
  onAdd: (item: InvestmentRecommendation) => void;
}) {
  return (
    <section aria-label="候选观察" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-base font-semibold">候选观察</h3>
        <span className={cn("text-[13px]", investmentMutedTextClassName)}>规则筛选 · 非投资建议</span>
      </div>
      {items.length ? <ul className="home-preview-divide-y m-0 list-none divide-y p-0">
        {items.map(item => {
          const isWatched = watchlist.some(row => row.instrumentCode === item.instrumentCode && row.instrumentType === item.instrumentType);
          return (
            <li className="flex min-w-0 items-center gap-3 py-3" key={`${item.instrumentType}:${item.instrumentCode}`}>
              <InvestmentInstrumentIcon instrumentType={item.instrumentType} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{item.instrumentName}</span>
                  <span className={cn("text-[13px] tabular-nums", investmentMutedTextClassName)}>{item.instrumentCode}</span>
                  <Tag className="m-0! text-xs!" color={item.instrumentType === "stock" ? "blue" : "gold"}>{item.instrumentType === "stock" ? "股票" : "基金"}</Tag>
                </div>
                <Tooltip title={`${item.reason}；${getInvestmentQuoteLabel(item.quote)} · ${item.quote.source} · ${item.updatedAt ?? "来源未提供时间"}；${item.source}`}>
                  <span className={cn("mt-1 block truncate text-[13px]", investmentMutedTextClassName)}>{item.reason}</span>
                </Tooltip>
              </div>
              <span className={cn("shrink-0 text-sm font-semibold tabular-nums", getChangeClass(item.changePercent))}>{formatChange(item.changePercent)}</span>
              <Tooltip title={isWatched ? "已在我的关注中" : "添加到关注"}>
                <Button
                  aria-label={isWatched ? `${item.instrumentName} 已关注` : `添加 ${item.instrumentName} 到关注`}
                  disabled={isWatched || Boolean(creatingInstrumentCode)}
                  icon={isWatched ? <CheckCircleOutlined /> : <PlusOutlined />}
                  loading={!isWatched && creatingInstrumentCode === item.instrumentCode}
                  onClick={() => onAdd(item)}
                  shape="circle"
                  size="small"
                />
              </Tooltip>
            </li>
          );
        })}
      </ul> : <p className={cn("my-6 text-sm", investmentMutedTextClassName)}>暂无可用候选，等待公开行情与规则更新。</p>}
    </section>
  );
}

function MarketSignalPanel({ items }: { items: InvestmentSectorSignal[] }) {
  return (
    <section aria-label="板块信号" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-base font-semibold">板块信号</h3>
        <span className={cn("text-[13px]", investmentMutedTextClassName)}>规则信号 · 仅供参考</span>
      </div>
      {items.length ? <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-4 p-0 @min-[1100px]/investment-workspace:grid-cols-3">
        {items.map(item => {
          const state = getInvestmentSectorState(item);
          return <li className="min-w-0" key={`${item.source}-${item.name}`}>
            <Tooltip title={`${item.reason}；${item.source} · ${item.updatedAt ?? "来源未提供时间"}`}>
              <span className="block truncate text-sm">{item.name}</span>
            </Tooltip>
            <span className={cn("mt-1 block text-xl font-semibold tabular-nums", getChangeClass(item.changePercent))}>{formatChange(item.changePercent)}</span>
            <span className={cn("mt-1 block text-[13px]", investmentMutedTextClassName)}>{state.label} · {state.direction === "待判断" ? "待判断" : `规则${state.direction}`}</span>
            <span className={cn("mt-1 block text-xs", investmentFaintTextClassName)}>{item.source}</span>
            <span className={cn("mt-1 block text-xs tabular-nums", investmentFaintTextClassName)}>{item.updatedAt ? `行情时间 ${item.updatedAt}` : "来源未提供行情时间"}</span>
          </li>;
        })}
      </ul> : <p className={cn("my-6 text-sm", investmentMutedTextClassName)}>板块行情暂不可用，等待下次更新。</p>}
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
