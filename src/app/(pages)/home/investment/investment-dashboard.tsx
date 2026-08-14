"use client";

import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { cn } from "@/lib/utils";
import {
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
import type {
  InvestmentDashboardData,
  InvestmentRecommendation,
  InvestmentSearchResult,
  InvestmentSectorSignal,
  InvestmentWatchlistEntry,
} from "./investment-types";

type InvestmentFilter = "all" | "fund" | "stock";
type InvestmentDashboardProps = { initialData: InvestmentDashboardData };

type CreateInstrumentForm = {
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

/** 复用 ECharts 渲染微型行情趋势，空序列不会显示成真实走势。 */
function TrendChart({ trend, value }: { trend: number[]; value: number | null }) {
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
    return <Typography.Text className="text-[10px]" type="secondary">走势待更新</Typography.Text>;
  }

  return (
    <div aria-label="趋势图" className="min-w-0">
      <div className="h-11 w-full" ref={chartElement} />
      <div className="flex justify-between text-[10px] text-black/35 dark:text-white/35">
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [draggedId, setDraggedId] = useState<string>();
  const [searchResults, setSearchResults] = useState<InvestmentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState<CreateInstrumentForm>({
    instrumentCode: "",
    instrumentName: "",
    instrumentType: "fund",
  });
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    enabled: false,
    notifyOnRecommendation: false,
    notifyOnSignal: false,
    webhookUrl: "",
  });

  const visibleWatchlist = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return data.watchlist.filter((item) =>
      (filter === "all" || item.instrumentType === filter) &&
      (!normalizedKeyword ||
        item.instrumentCode.includes(normalizedKeyword) ||
        item.instrumentName.toLowerCase().includes(normalizedKeyword)),
    );
  }, [data.watchlist, filter, keyword]);

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
    const searchKeyword = form.instrumentCode.trim() || form.instrumentName.trim();
    if (!isCreateOpen || searchKeyword.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/investment/search?q=${encodeURIComponent(searchKeyword)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const results = (await response.json()) as InvestmentSearchResult[];
        setSearchResults(results.filter((item) => item.instrumentType === form.instrumentType));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.instrumentCode, form.instrumentName, form.instrumentType, isCreateOpen]);

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

  async function createWatchlistItem(nextForm = form) {
    setIsCreating(true);
    try {
      const response = await fetch("/api/investment", {
        body: JSON.stringify({
          instrument_code: nextForm.instrumentCode,
          instrument_name: nextForm.instrumentName,
          instrument_type: nextForm.instrumentType,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "create failed");
      setForm({ instrumentCode: "", instrumentName: "", instrumentType: "fund" });
      setIsCreateOpen(false);
      message.success("已加入我的关注");
      await refreshDashboard(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "添加关注失败");
    } finally {
      setIsCreating(false);
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

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-4" data-investment-dashboard>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <div aria-label="投资图标预留" className="size-7 shrink-0" />
          <Typography.Title className="m-0! text-[22px]! max-sm:text-xl!" level={2}>今日市场信号</Typography.Title>
          <Tag className="m-0 border-0 bg-emerald-50 px-2 py-1 text-emerald-700">{data.marketStateLabel}</Tag>
        </div>
        <div className="flex items-center gap-1 text-xs text-black/45 dark:text-white/45">
          <span>公开行情 · 更新于 {data.dataUpdatedAt}</span>
          <Tooltip title="手动刷新"><Button aria-label="手动刷新" icon={<ReloadOutlined />} loading={isRefreshing} onClick={() => void refreshDashboard()} type="text" /></Tooltip>
          <Tooltip title="通知设置"><Button aria-label="通知设置" icon={<SettingOutlined />} onClick={() => { setNotificationForm({ enabled: false, notifyOnRecommendation: false, notifyOnSignal: false, webhookUrl: "" }); setIsNotificationOpen(true); }} type="text" /></Tooltip>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 max-[980px]:grid-cols-1">
        <section className="home-preview-panel flex min-h-0 flex-col border bg-white/55 p-4 shadow-sm dark:bg-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Typography.Title className="m-0! text-lg!" level={3}>我的关注</Typography.Title><Typography.Text type="secondary">({data.watchlist.length})</Typography.Text></div>
            <div className="flex items-center gap-2"><Input allowClear className="w-43 max-sm:w-38" onChange={(event) => setKeyword(event.target.value)} placeholder="搜索代码/名称" prefix={<SearchOutlined />} value={keyword} /><Tooltip title="添加关注"><Button aria-label="添加关注" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} type="text" /></Tooltip></div>
          </div>
          <Segmented className="mt-3 w-fit" onChange={(value) => setFilter(value as InvestmentFilter)} options={filterOptions} value={filter} />
          <div className="home-preview-divider mt-4 hidden grid-cols-[minmax(0,1.15fr)_82px_114px_minmax(0,.8fr)_30px] gap-2 border-b pb-2 text-xs text-black/45 min-[720px]:grid dark:text-white/45">
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

      <Drawer destroyOnHidden footer={<Button loading={isCreating} onClick={() => void createWatchlistItem()} type="primary">加入关注</Button>} onClose={() => setIsCreateOpen(false)} open={isCreateOpen} title="添加关注" width={400}>
        <div className="flex flex-col gap-4">
          <Segmented onChange={(value) => { setSearchResults([]); setForm((current) => ({ ...current, instrumentType: value as "fund" | "stock" })); }} options={[{ label: "基金", value: "fund" }, { label: "股票", value: "stock" }]} value={form.instrumentType} />
          <Input onChange={(event) => { setSearchResults([]); setForm((current) => ({ ...current, instrumentCode: event.target.value })); }} placeholder={form.instrumentType === "fund" ? "输入基金代码或名称搜索" : "输入 00 开头股票代码或名称搜索"} prefix={<SearchOutlined />} value={form.instrumentCode} />
          <Input onChange={(event) => { setSearchResults([]); setForm((current) => ({ ...current, instrumentName: event.target.value })); }} placeholder="名称" value={form.instrumentName} />
          {isSearching ? <Spin size="small" /> : null}
          {searchResults.length ? <div className="home-preview-panel home-preview-divide-y divide-y border-y">{searchResults.map((item) => <button className="flex w-full items-center justify-between gap-3 py-2 text-left" key={`${item.instrumentType}-${item.instrumentCode}`} onClick={() => setForm({ instrumentCode: item.instrumentCode, instrumentName: item.instrumentName, instrumentType: item.instrumentType })} type="button"><span className="truncate">{item.instrumentName}</span><span className="shrink-0 text-xs text-black/45 dark:text-white/45">{item.instrumentCode}</span></button>)}</div> : null}
          <Typography.Text type="secondary">可手工输入，也可按代码或名称从公开数据源搜索。股票仅允许 00 开头代码。</Typography.Text>
        </div>
      </Drawer>

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

function WatchlistRow({ item, onDragEnd, onDragStart, onDrop, onRemove }: { item: InvestmentWatchlistEntry; onDragEnd: () => void; onDragStart: () => void; onDrop: () => void; onRemove: () => void }) {
  return <div className="home-preview-divider flex flex-col gap-2 border-b py-4 last:border-b-0 min-[720px]:grid min-[720px]:grid-cols-[minmax(0,1.15fr)_82px_114px_minmax(0,.8fr)_30px] min-[720px]:items-center min-[720px]:gap-2" draggable onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDragStart={onDragStart} onDrop={onDrop}>
    <div className="flex min-w-0 items-center gap-2"><DragOutlined className="cursor-grab text-black/35 dark:text-white/35" /><div aria-label="项目图标预留" className="size-7 shrink-0" /><div className="min-w-0"><Typography.Text className="block truncate" strong>{item.instrumentName}</Typography.Text><Typography.Text className="text-xs" type="secondary">{item.instrumentCode} · {item.instrumentType === "fund" ? "基金" : "股票"}</Typography.Text></div></div>
    <MetricCell label="今日涨跌" value={formatChange(item.quote.changePercent)} valueClassName={getChangeClass(item.quote.changePercent)} detail={`${item.quote.source}${item.quote.updatedAt ? ` · ${item.quote.updatedAt}` : ""}`} />
    <MetricCell label="下一交易日预测" value={item.forecast.value} valueClassName={item.forecast.value.includes("-") || item.forecast.value === "偏弱" ? "text-emerald-600" : "text-red-500"} detail={item.forecast.label} />
    <TrendChart trend={item.trend} value={item.quote.changePercent} />
    <Popconfirm cancelText="取消" okText="移除" onConfirm={onRemove} title="移除此关注项？"><Button aria-label={`删除 ${item.instrumentName}`} icon={<DeleteOutlined />} size="small" type="text" /></Popconfirm>
  </div>;
}

function MetricCell({ detail, label, value, valueClassName }: { detail: string; label: string; value: string; valueClassName?: string }) {
  return <div><Typography.Text className="mr-2 text-xs min-[720px]:hidden" type="secondary">{label}</Typography.Text><Typography.Text className={cn("font-semibold", valueClassName)}>{value}</Typography.Text><Typography.Text className="mt-0.5 block text-[10px]" type="secondary">{detail}</Typography.Text></div>;
}

function RecommendationPanel({ items, onAdd }: { items: InvestmentRecommendation[]; onAdd: (item: InvestmentRecommendation) => void }) {
  return <section className="home-preview-panel border bg-white/55 p-4 shadow-sm dark:bg-black/10"><div className="flex items-center gap-2"><Typography.Title className="m-0! text-lg!" level={3}>推荐关注</Typography.Title><Tag className="m-0 rounded-full border-0 bg-emerald-50 text-emerald-700">{items.length}</Tag></div><Typography.Text className="mt-1 block text-xs" type="secondary">基金展示下一交易日估计；股票只展示方向判断。</Typography.Text><div className="home-preview-divide-y mt-2 divide-y">{items.map((item) => <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3" key={item.instrumentCode}><div className="min-w-0"><div className="flex items-center gap-2"><div aria-label="项目图标预留" className="size-6 shrink-0" /><Typography.Text className="truncate" strong>{item.instrumentName}</Typography.Text></div><Typography.Text className="ml-8 block truncate text-xs" type="secondary">{item.instrumentCode} · {item.reason}</Typography.Text></div><div className="text-right"><Typography.Text className={cn("font-semibold", getChangeClass(item.changePercent))}>{formatChange(item.changePercent)}</Typography.Text><Typography.Text className={cn("ml-2 text-sm font-semibold", item.forecast.includes("-") ? "text-emerald-600" : "text-red-500")}>{item.forecast}</Typography.Text><div className="text-[10px] text-black/40 dark:text-white/40">{item.source}{item.updatedAt ? ` · ${item.updatedAt}` : ""}</div></div><Button onClick={() => onAdd(item)} size="small">加入关注</Button></div>)}</div></section>;
}

function MarketSignalPanel({ items }: { items: InvestmentSectorSignal[] }) {
  return <section className="home-preview-panel flex min-h-0 flex-col border bg-white/55 p-4 shadow-sm dark:bg-black/10"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Typography.Title className="m-0! text-lg!" level={3}>市场信号地图</Typography.Title><Typography.Text type="secondary">下一交易日判断</Typography.Text></div><OverlayScrollArea className="mt-3 min-h-0 flex-1" viewportClassName="overflow-x-hidden" vertical><div className="home-preview-divide-y divide-y">{items.map((item) => <div className="flex flex-col gap-2 py-3 min-[760px]:grid min-[760px]:grid-cols-[minmax(108px,.7fr)_72px_100px_minmax(80px,.65fr)_minmax(0,1.1fr)] min-[760px]:items-center min-[760px]:gap-3" key={item.name}><div className="flex min-w-0 items-center gap-2"><div aria-label="板块图标预留" className="size-6 shrink-0" /><Typography.Text className="truncate" strong>{item.name}</Typography.Text></div><MetricCell detail={item.isLive ? item.source : "等待公开行情"} label="今日涨跌" value={formatChange(item.changePercent)} valueClassName={getChangeClass(item.changePercent)} /><MetricCell detail="下一交易日" label="规则判断" value={`${item.direction}${item.forecastPercent === undefined ? "" : ` ${formatChange(item.forecastPercent)}`}`} valueClassName={item.direction === "偏弱" ? "text-emerald-600" : item.direction === "偏涨" ? "text-red-500" : undefined} /><TrendChart trend={item.trend} value={item.changePercent} /><Typography.Text className="line-clamp-2 text-xs" type="secondary">{item.reason}{item.updatedAt ? ` · ${item.updatedAt}` : ""}</Typography.Text></div>)}</div></OverlayScrollArea></section>;
}

function EvidenceStrip({ evidence }: { evidence: InvestmentDashboardData["evidence"] }) {
  const fetched = evidence.filter((item) => item.status === "fetched");
  const failed = evidence.filter((item) => item.status === "failed");
  const signalScore = fetched.reduce((total, item) => total + item.signalScore, 0);
  return <section className="home-preview-panel flex flex-wrap items-center gap-x-5 gap-y-2 border bg-white/45 px-4 py-3 text-sm dark:bg-black/10"><Typography.Text strong>信号依据</Typography.Text><span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">规则 MD</span><Typography.Text type="secondary">{fetched.length ? `已抓取 ${fetched.map((item) => item.title).join("、")}` : "等待公开来源响应"}</Typography.Text>{fetched.length ? <Typography.Text type="secondary">文本信号 {signalScore > 0 ? "偏涨" : signalScore < 0 ? "偏弱" : "中性"}</Typography.Text> : null}{failed.length ? <Typography.Text className="text-amber-700 dark:text-amber-300">抓取失败 {failed.length} 个</Typography.Text> : null}</section>;
}
