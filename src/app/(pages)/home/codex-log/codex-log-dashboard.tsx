"use client";

import { cn } from "@/lib/utils";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
  type TableProps,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  BarChart,
  LineChart,
  PieChart,
  type BarSeriesOption,
  type LineSeriesOption,
  type PieSeriesOption,
} from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CodexLogDashboardData,
  CodexLogRecord,
  CodexLogRepositoryStat,
  CodexLogTrendPoint,
} from "./codex-log-utils";
import { HomeContentFullscreenButton } from "../home-content-fullscreen";

echarts.use([
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  PieChart,
  TooltipComponent,
]);

type ChartOption = ComposeOption<
  | BarSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | LineSeriesOption
  | PieSeriesOption
  | TooltipComponentOption
>;

type CodexLogDashboardProps = {
  data: CodexLogDashboardData;
};

type SummaryState =
  | { status: "idle" | "loading"; error?: never; result?: never }
  | {
      status: "ready";
      error?: never;
      result: CodexDailySummary;
    }
  | { status: "error"; error: string; result?: never };

type CodexDailySummary = {
  growth: string;
  shortage: string;
  summary: string;
};

type ChartPalette = {
  accent: string;
  border: string;
  muted: string;
  surface: string;
  text: string;
};

type MetricDelta = {
  direction: "down" | "flat" | "up";
  text: string;
};

type TableSorterState = {
  field:
    | "assistant_summary"
    | "thread_title"
    | "time"
    | "token_count"
    | "user_tasks";
  order: "ascend" | "descend" | null;
};

type TableFilterState = {
  time: string[];
  token_count: string[];
};

const hourFilters = [
  { text: "上午", value: "morning" },
  { text: "下午", value: "afternoon" },
  { text: "晚上", value: "night" },
];

const tokenFilters = [
  { text: "1k 以下", value: "small" },
  { text: "1k - 10k", value: "medium" },
  { text: "10k 以上", value: "large" },
];

const defaultPalette: ChartPalette = {
  accent: "#22c55e",
  border: "rgba(34, 197, 94, 0.32)",
  muted: "rgba(107, 114, 128, 0.78)",
  surface: "#ffffff",
  text: "#111827",
};
const panelClassName =
  "rounded-lg border border-[color-mix(in_srgb,var(--home-theme-text)_12%,transparent)] bg-[color-mix(in_srgb,var(--home-theme-bg)_94%,#ffffff_6%)] shadow-sm";
const quietPanelClassName =
  "rounded-lg border border-[color-mix(in_srgb,var(--home-theme-text)_10%,transparent)] bg-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)]";
const scrollbarClassName = "";
const tableScrollbarClassName =
  "[&_.ant-table-content]:overflow-auto [&_.ant-table-body]:overflow-auto";
const metricToneClassNames = {
  codex: {
    card: "",
    help: "text-[color-mix(in_srgb,#18f83a_76%,var(--home-theme-text)_24%)]!",
    icon: "border-[color-mix(in_srgb,#18f83a_50%,transparent)]! bg-[color-mix(in_srgb,#18f83a_14%,transparent)]! text-[#18f83a]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
  neutral: {
    card: "",
    help: "text-[color-mix(in_srgb,#6f7378_72%,var(--home-theme-text)_28%)]!",
    icon: "border-[color-mix(in_srgb,#6f7378_38%,transparent)]! bg-[color-mix(in_srgb,#6f7378_12%,transparent)]! text-[#6f7378]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
  proportion: {
    card: "",
    help: "text-[color-mix(in_srgb,#f59e0b_74%,var(--home-theme-text)_26%)]!",
    icon: "border-[color-mix(in_srgb,#f59e0b_52%,transparent)]! bg-[color-mix(in_srgb,#f59e0b_14%,transparent)]! text-[#f59e0b]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
  store: {
    card: "",
    help: "text-[color-mix(in_srgb,#a78bfa_76%,var(--home-theme-text)_24%)]!",
    icon: "border-[color-mix(in_srgb,#a855f7_52%,transparent)]! bg-[color-mix(in_srgb,#a855f7_14%,transparent)]! text-[#a855f7]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
  task: {
    card: "",
    help: "text-[color-mix(in_srgb,#22c55e_76%,var(--home-theme-text)_24%)]!",
    icon: "border-[color-mix(in_srgb,#22c55e_52%,transparent)]! bg-[color-mix(in_srgb,#22c55e_14%,transparent)]! text-[#22c55e]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
  token: {
    card: "",
    help: "text-[color-mix(in_srgb,#22d3ee_76%,var(--home-theme-text)_24%)]!",
    icon: "border-[color-mix(in_srgb,#22d3ee_52%,transparent)]! bg-[color-mix(in_srgb,#22d3ee_14%,transparent)]! text-[#22d3ee]!",
    label: "text-[color-mix(in_srgb,var(--home-theme-text)_66%,transparent)]!",
    value: "text-(--home-theme-text)!",
  },
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatToken(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}w`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return String(value);
}

function toMetricDeltaText(value: number, precision = 1) {
  if (value === 0) {
    return "+0";
  }

  const absValue = Math.abs(value);
  const formatted =
    Number.isInteger(absValue) || absValue >= 10
      ? Math.round(absValue).toString()
      : absValue.toFixed(precision);

  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function getMetricDirection(value: number): MetricDelta["direction"] {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return "flat";
}

function buildPercentDelta(current: number, previous: number): MetricDelta {
  if (previous <= 0) {
    const diff = current - previous;

    return {
      direction: getMetricDirection(diff),
      text: diff === 0 ? "+0" : toMetricDeltaText(diff),
    };
  }

  const percent = ((current - previous) / previous) * 100;

  return {
    direction: getMetricDirection(percent),
    text: `${toMetricDeltaText(percent)}%`,
  };
}

function buildNumberDelta(current: number, previous: number): MetricDelta {
  const diff = current - previous;

  return {
    direction: getMetricDirection(diff),
    text: toMetricDeltaText(diff),
  };
}

function buildPointDelta(current: number, previous: number): MetricDelta {
  const diff = current - previous;

  return {
    direction: getMetricDirection(diff),
    text: `${toMetricDeltaText(diff)}%`,
  };
}

function getHourFilterValue(hour: number | null) {
  if (hour === null) {
    return "";
  }

  if (hour >= 6 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  return "night";
}

function getTokenFilterValue(tokenCount: number) {
  if (tokenCount < 1000) {
    return "small";
  }

  if (tokenCount < 10000) {
    return "medium";
  }

  return "large";
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "zh-CN");
}

function getRecordTimestamp(record: CodexLogRecord) {
  const value = record.created_at ? new Date(record.created_at).getTime() : 0;

  return Number.isNaN(value) ? 0 : value;
}

function getSortedRecords(records: CodexLogRecord[], sorter: TableSorterState) {
  if (!sorter.order) {
    return records;
  }

  const direction = sorter.order === "ascend" ? 1 : -1;

  return [...records].sort((left, right) => {
    if (sorter.field === "time") {
      return (getRecordTimestamp(left) - getRecordTimestamp(right)) * direction;
    }

    if (sorter.field === "token_count") {
      return (left.token_count - right.token_count) * direction;
    }

    return compareText(left[sorter.field], right[sorter.field]) * direction;
  });
}

function readThemePalette(): ChartPalette {
  if (typeof window === "undefined") {
    return defaultPalette;
  }

  const root =
    document.querySelector<HTMLElement>(".home-shell") ??
    document.documentElement;
  const style = window.getComputedStyle(root);
  const readVar = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    accent: readVar("--home-theme-color", defaultPalette.accent),
    border: `color-mix(in srgb, ${readVar(
      "--home-theme-color",
      defaultPalette.accent,
    )} 30%, transparent)`,
    muted: `color-mix(in srgb, ${readVar(
      "--home-theme-text",
      defaultPalette.text,
    )} 56%, transparent)`,
    surface: readVar("--home-theme-bg", defaultPalette.surface),
    text: readVar("--home-theme-text", defaultPalette.text),
  };
}

function useChartPalette() {
  const [palette, setPalette] = useState<ChartPalette>(defaultPalette);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setPalette(readThemePalette());
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return palette;
}

function MetricIcon({
  className,
  iconClassName,
  name,
  tone = "neutral",
}: {
  className?: string;
  iconClassName?: string;
  name: string;
  tone?: keyof typeof metricToneClassNames;
}) {
  return (
    <span
      className={cn(
        "codex-log-metric-icon inline-flex size-10.5 items-center justify-center rounded-lg",
        metricToneClassNames[tone].icon,
        className,
      )}
    >
      <i
        aria-hidden
        className={cn("iconfont text-2xl leading-none", name, iconClassName)}
      />
    </span>
  );
}

function DashboardPanel({
  children,
  className,
  extra,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <Card
      className={cn(
        "codex-log-panel flex min-h-0 min-w-0 flex-col overflow-hidden",
        panelClassName,
        className,
      )}
      classNames={{
        body: "flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4! md:p-5!",
      }}
    >
      {title || extra ? (
        <div className="codex-log-panel-header flex min-h-8 items-center justify-between gap-3">
          {title ? <PanelTitle icon={icon} title={title} /> : <span />}
          {extra}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

function EChart({
  empty,
  emptyText = "暂无图表数据",
  option,
}: {
  empty?: boolean;
  emptyText?: string;
  option: ChartOption;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const element = chartRef.current;

    if (!element) {
      return;
    }

    const chart = echarts.init(element);
    chartInstanceRef.current = chart;

    function resizeChart() {
      chart.resize();
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(resizeChart);

    resizeObserver?.observe(element);
    window.addEventListener("resize", resizeChart);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeChart);
      chartInstanceRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    const chart = chartInstanceRef.current;

    if (!chart) {
      return;
    }

    if (empty) {
      chart.clear();
      return;
    }

    chart.setOption(option, true);
    chart.resize();
  }, [empty, option]);

  return (
    <div className="codex-log-chart-shell relative min-h-55 flex-1">
      <div
        className={cn(
          "codex-log-chart h-full min-h-55 w-full",
          empty && "pointer-events-none opacity-0",
        )}
        ref={chartRef}
      />
      {empty ? (
        <Empty
          className="codex-log-chart-empty absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          description={emptyText}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : null}
    </div>
  );
}

function ChartPanel({
  empty,
  emptyText,
  option,
  title,
}: {
  empty?: boolean;
  emptyText?: string;
  option: ChartOption;
  title: string;
}) {
  return (
    <DashboardPanel className="codex-log-chart-panel min-h-75" title={title}>
      <EChart empty={empty} emptyText={emptyText} option={option} />
    </DashboardPanel>
  );
}

function buildTrendOption(
  trend: CodexLogTrendPoint[],
  palette: ChartPalette,
): ChartOption {
  return {
    color: [palette.accent, "#60a5fa"],
    grid: {
      bottom: 32,
      left: 42,
      right: 20,
      top: 26,
    },
    legend: {
      bottom: 0,
      icon: "roundRect",
      itemHeight: 8,
      itemWidth: 14,
      textStyle: {
        color: palette.muted,
      },
    },
    series: [
      {
        barMaxWidth: 22,
        data: trend.map((item) => item.taskCount),
        name: "任务",
        type: "bar",
      },
      {
        data: trend.map((item) => item.tokenTotal),
        name: "Token",
        smooth: true,
        type: "line",
        yAxisIndex: 1,
      },
    ],
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      axisLabel: {
        color: palette.muted,
      },
      axisLine: {
        lineStyle: {
          color: palette.border,
        },
      },
      axisTick: {
        show: false,
      },
      data: trend.map((item) => item.label),
      type: "category",
    },
    yAxis: [
      {
        axisLabel: {
          color: palette.muted,
        },
        splitLine: {
          lineStyle: {
            color: palette.border,
          },
        },
        type: "value",
      },
      {
        axisLabel: {
          color: palette.muted,
          formatter: (value: number) => formatToken(value),
        },
        splitLine: {
          show: false,
        },
        type: "value",
      },
    ],
  };
}

function buildRepositoryOption(
  repositories: CodexLogRepositoryStat[],
  palette: ChartPalette,
): ChartOption {
  return {
    color: [
      palette.accent,
      "#38bdf8",
      "#f59e0b",
      "#a78bfa",
      "#f472b6",
      "#2dd4bf",
    ],
    legend: {
      bottom: 0,
      icon: "circle",
      itemHeight: 8,
      itemWidth: 8,
      textStyle: {
        color: palette.muted,
      },
    },
    series: [
      {
        avoidLabelOverlap: true,
        data: repositories.map((item) => ({
          name: item.label,
          value: item.taskCount,
        })),
        emphasis: {
          label: {
            color: palette.text,
            show: true,
          },
        },
        label: {
          color: palette.text,
          formatter: "{b}",
        },
        name: "仓库",
        radius: ["48%", "70%"],
        top: -18,
        type: "pie",
      },
    ],
    tooltip: {
      trigger: "item",
    },
  };
}

function PanelTitle({ icon, title }: { icon?: ReactNode; title: string }) {
  return (
    <div className="codex-log-panel-title flex min-w-0 items-center gap-2">
      {icon}
      <Typography.Title className="!mb-0 !text-base text-balance" level={5}>
        {title}
      </Typography.Title>
    </div>
  );
}

function TaskList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: CodexLogRecord[];
}) {
  if (items.length === 0) {
    return (
      <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  return (
    <ul
      className={cn(
        "codex-log-rank-list m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-auto p-0",
        scrollbarClassName,
      )}
    >
      {items.map((item, index) => (
        <li
          className={cn(
            "codex-log-rank-item grid min-h-12 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5",
            quietPanelClassName,
          )}
          key={item.key}
        >
          <span className="codex-log-rank-index inline-flex size-6 items-center justify-center rounded-[7px] text-xs font-bold">
            {index + 1}
          </span>
          <span
            className="codex-log-rank-title overflow-hidden text-ellipsis whitespace-nowrap"
            title={item.user_tasks}
          >
            {item.user_tasks}
          </span>
          <span className="codex-log-rank-meta whitespace-nowrap text-xs">
            {formatToken(item.token_count)} Token
          </span>
        </li>
      ))}
    </ul>
  );
}

function SummaryPanel({
  date,
  initialSummary,
}: {
  date: string;
  initialSummary: CodexDailySummary | null;
}) {
  const [summaryState, setSummaryState] = useState<SummaryState>(() =>
    initialSummary
      ? { result: initialSummary, status: "ready" }
      : { status: "idle" },
  );

  const loadSummary = useCallback(
    async (signal?: AbortSignal) => {
      setSummaryState({ status: "loading" });

      try {
        const response = await fetch("/api/codex-log/summary", {
          body: JSON.stringify({ date }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal,
        });
        const result = (await response.json().catch(() => ({}))) as
          | (Partial<CodexDailySummary> & { message?: string })
          | null;

        if (!response.ok) {
          throw new Error(result?.message ?? "总结生成失败");
        }

        setSummaryState({
          result: {
            growth: result?.growth?.trim() || "暂无成长总结",
            shortage: result?.shortage?.trim() || "暂无不足总结",
            summary: result?.summary?.trim() || "暂无工作总结",
          },
          status: "ready",
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSummaryState({
          error: error instanceof Error ? error.message : "总结生成失败",
          status: "error",
        });
      }
    },
    [date],
  );

  useEffect(() => {
    if (initialSummary) {
      setSummaryState({ result: initialSummary, status: "ready" });
      return;
    }

    const controller = new AbortController();
    setSummaryState({ status: "idle" });
    const timerId = window.setTimeout(() => {
      void loadSummary(controller.signal);
    });

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [
    date,
    initialSummary?.growth,
    initialSummary?.shortage,
    initialSummary?.summary,
    loadSummary,
  ]);

  return (
    <DashboardPanel
      className="codex-log-summary-panel min-h-60"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={summaryState.status === "loading"}
          onClick={() => void loadSummary()}
          size="small"
          type="text"
        />
      }
      icon={<MetricIcon name="icon-codex" tone="codex" />}
      title="总结"
    >
      {summaryState.status === "loading" ? (
        <div className="codex-log-summary-loading flex min-h-45 flex-1 items-center justify-center">
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      ) : summaryState.status === "error" ? (
        <Typography.Text type="danger">{summaryState.error}</Typography.Text>
      ) : summaryState.status === "ready" ? (
        <div className="codex-log-summary-grid grid grid-cols-1 gap-3 lg:grid-cols-3">
          <SummaryBlock label="总结" text={summaryState.result.summary} />
          <SummaryBlock label="成长" text={summaryState.result.growth} />
          <SummaryBlock label="不足" text={summaryState.result.shortage} />
        </div>
      ) : null}
    </DashboardPanel>
  );
}

function SummaryBlock({ label, text }: { label: string; text: string }) {
  return (
    <div
      className={cn(
        "codex-log-summary-block min-w-0 rounded-lg border p-4",
        quietPanelClassName,
      )}
    >
      <span className="mb-2 block text-sm font-bold text-balance">{label}</span>
      <Typography.Paragraph className="!mb-0 text-pretty">
        {text}
      </Typography.Paragraph>
    </div>
  );
}

export function CodexLogDashboard({ data }: CodexLogDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const palette = useChartPalette();
  const [keyword, setKeyword] = useState("");
  const [repository, setRepository] = useState<string>("all");
  const [tableFilters, setTableFilters] = useState<TableFilterState>({
    time: [],
    token_count: [],
  });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(6);
  const [tableSorter, setTableSorter] = useState<TableSorterState>({
    field: "time",
    order: "descend",
  });
  const selectedDay = dayjs(data.selectedDate);
  const trendOption = useMemo(
    () => buildTrendOption(data.trend, palette),
    [data.trend, palette],
  );
  const repositoryOption = useMemo(
    () => buildRepositoryOption(data.repositoryDistribution, palette),
    [data.repositoryDistribution, palette],
  );
  const repositoryOptions = useMemo(
    () => [
      { label: "全部仓库", value: "all" },
      ...data.repositoryDistribution.map((item) => ({
        label: item.label,
        value: item.label,
      })),
    ],
    [data.repositoryDistribution],
  );
  const tokenHint =
    data.stats.tokenSource === "desktop"
      ? `使用 Codex 桌面 usage 聚合；入库估算为 ${formatToken(data.stats.databaseTokenTotal)} Token。`
      : "未读取到本机 Codex 桌面 usage，当前使用 codex_log.token_count 入库值。";
  const metricDeltas = {
    estimatedRatio: buildPointDelta(
      data.stats.estimatedRatio,
      data.stats.previous.estimatedRatio,
    ),
    repositoryCount: buildNumberDelta(
      data.stats.repositoryCount,
      data.stats.previous.repositoryCount,
    ),
    taskCount: buildPercentDelta(
      data.stats.taskCount,
      data.stats.previous.taskCount,
    ),
    tokenTotal: buildPercentDelta(
      data.stats.tokenTotal,
      data.stats.previous.tokenTotal,
    ),
  };
  const filteredRecords = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return data.records.filter((record) => {
      const matchesRepository =
        repository === "all" || record.repository === repository;
      const matchesKeyword =
        !lowerKeyword ||
        [
          record.assistant_summary,
          record.repository,
          record.thread_title,
          record.user_tasks,
        ]
          .join(" ")
          .toLowerCase()
          .includes(lowerKeyword);

      return matchesRepository && matchesKeyword;
    });
  }, [data.records, keyword, repository]);
  const tableRecords = useMemo(() => {
    const nextRecords = filteredRecords.filter((record) => {
      const matchesTime =
        !tableFilters.time.length ||
        tableFilters.time.includes(getHourFilterValue(record.hour));
      const matchesToken =
        !tableFilters.token_count.length ||
        tableFilters.token_count.includes(
          getTokenFilterValue(record.token_count),
        );

      return matchesTime && matchesToken;
    });

    return getSortedRecords(nextRecords, tableSorter);
  }, [filteredRecords, tableFilters, tableSorter]);
  const tableTotal = tableRecords.length;
  const maxTablePage = Math.max(1, Math.ceil(tableTotal / tablePageSize));
  const safeTablePage = Math.min(tablePage, maxTablePage);
  const columns: TableColumnsType<CodexLogRecord> = [
    {
      dataIndex: "time",
      filteredValue: tableFilters.time,
      filters: hourFilters,
      sorter: true,
      sortOrder: tableSorter.field === "time" ? tableSorter.order : null,
      sortDirections: ["descend", "ascend"],
      title: "时间",
      width: 86,
    },
    {
      dataIndex: "thread_title",
      render: (value: string, record) => (
        <div className="codex-log-title-cell flex min-w-0 items-center gap-2 overflow-hidden">
          <Tag>{record.repository}</Tag>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {value}
          </span>
        </div>
      ),
      sorter: true,
      sortOrder:
        tableSorter.field === "thread_title" ? tableSorter.order : null,
      sortDirections: ["ascend", "descend"],
      title: "会话",
      width: 170,
    },
    {
      dataIndex: "user_tasks",
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Typography.Text
          className="block max-w-55"
          ellipsis={{ tooltip: value }}
        >
          {value}
        </Typography.Text>
      ),
      sorter: true,
      sortOrder: tableSorter.field === "user_tasks" ? tableSorter.order : null,
      sortDirections: ["ascend", "descend"],
      title: "任务",
      width: 230,
    },
    {
      dataIndex: "assistant_summary",
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Typography.Text
          className="block max-w-60"
          ellipsis={{ tooltip: value }}
        >
          {value}
        </Typography.Text>
      ),
      sorter: true,
      sortOrder:
        tableSorter.field === "assistant_summary" ? tableSorter.order : null,
      sortDirections: ["ascend", "descend"],
      title: "回答简述",
      width: 250,
    },
    {
      align: "right",
      dataIndex: "token_count",
      filteredValue: tableFilters.token_count,
      filters: tokenFilters,
      render: (value: number) => formatToken(value),
      sorter: true,
      sortOrder: tableSorter.field === "token_count" ? tableSorter.order : null,
      sortDirections: ["descend", "ascend"],
      title: "Token",
      width: 112,
    },
  ];

  function handleDateChange(value: Dayjs | null) {
    if (!value) {
      return;
    }

    router.push(`${pathname}?date=${value.format("YYYY-MM-DD")}`);
  }

  const handleTableChange: TableProps<CodexLogRecord>["onChange"] = (
    pagination,
    filters,
    sorter,
    extra,
  ) => {
    const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = String(nextSorter.field ?? "");

    setTableFilters({
      time: (filters.time ?? []).map(String),
      token_count: (filters.token_count ?? []).map(String),
    });
    setTablePage(extra.action === "paginate" ? (pagination.current ?? 1) : 1);
    setTablePageSize(pagination.pageSize ?? tablePageSize);

    if (
      field === "assistant_summary" ||
      field === "thread_title" ||
      field === "time" ||
      field === "token_count" ||
      field === "user_tasks"
    ) {
      setTableSorter({
        field,
        order: nextSorter.order ?? null,
      });
    } else {
      setTableSorter({
        field: "time",
        order: "descend",
      });
    }
  };

  return (
    <div
      className={cn(
        "codex-log-dashboard flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-1 md:gap-5",
        scrollbarClassName,
      )}
    >
      <div
        className={cn(
          "codex-log-toolbar grid grid-cols-1 items-start gap-4 p-4 md:p-5 xl:flex xl:items-center xl:justify-between",
          panelClassName,
        )}
      >
        <div className="codex-log-page-title flex min-w-0 items-center gap-3">
          <MetricIcon
            className="shrink-0"
            name="icon-daily-report"
            tone="codex"
          />
          <div className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <Typography.Title className="!mb-0 !text-xl text-balance" level={4}>
                日报
              </Typography.Title>
              <HomeContentFullscreenButton />
            </div>
            <Typography.Title className="!hidden" level={4}>
              Codex日报
            </Typography.Title>
            <Typography.Text type="secondary">
              {data.selectedDate} · {formatNumber(data.stats.taskCount)} 个任务
            </Typography.Text>
          </div>
        </div>
        <div className="codex-log-toolbar-actions grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(160px,1fr)_minmax(180px,1.2fr)_40px] xl:w-180">
          <DatePicker
            allowClear={false}
            className="codex-log-date-picker w-full"
            disabledDate={(current) =>
              !data.availableDates.includes(current.format("YYYY-MM-DD"))
            }
            onChange={handleDateChange}
            value={selectedDay.isValid() ? selectedDay : undefined}
          />
          <Select
            className="codex-log-repo-select w-full"
            onChange={(value) => {
              setRepository(value);
              setTablePage(1);
            }}
            options={repositoryOptions}
            value={repository}
          />
          <Input
            allowClear
            className="codex-log-search w-full"
            onChange={(event) => {
              setKeyword(event.target.value);
              setTablePage(1);
            }}
            placeholder="搜索任务或回答"
            prefix={<SearchOutlined />}
            value={keyword}
          />
          <Button
            aria-label="刷新日报"
            className="w-full"
            icon={<SyncOutlined />}
            onClick={() => router.refresh()}
            type="text"
          />
        </div>
      </div>

      <section className="codex-log-metric-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          delta={metricDeltas.taskCount}
          icon="icon-task"
          label="今日任务"
          tone="task"
          value={formatNumber(data.stats.taskCount)}
        />
        <MetricCard
          delta={metricDeltas.tokenTotal}
          icon="icon-token"
          hint={tokenHint}
          label="Token"
          tone="token"
          value={formatNumber(data.stats.tokenTotal)}
        />
        <MetricCard
          delta={metricDeltas.repositoryCount}
          icon="icon-store"
          label="仓库"
          tone="store"
          value={formatNumber(data.stats.repositoryCount)}
        />
        <MetricCard
          delta={metricDeltas.estimatedRatio}
          icon="icon-proportion"
          label="估算占比"
          tone="proportion"
          value={`${data.stats.estimatedRatio}%`}
        />
      </section>

      <section className="codex-log-analysis-grid grid grid-cols-1 gap-4 xl:grid-cols-[minmax(420px,1.35fr)_minmax(300px,0.9fr)_minmax(300px,0.95fr)]">
        <ChartPanel
          empty={!data.trend.length}
          option={trendOption}
          title="任务与Token趋势"
        />
        <ChartPanel
          empty={!data.repositoryDistribution.length}
          option={repositoryOption}
          title="仓库占比"
        />
        <DashboardPanel className="min-h-75" title="最长会话">
          <TaskList emptyText="暂无会话" items={data.longestSessions} />
        </DashboardPanel>
      </section>

      <DashboardPanel
        className="codex-log-table-panel min-h-110 overflow-visible max-sm:min-h-105"
        extra={
          <Typography.Text type="secondary">
            {formatNumber(tableTotal)} 条
          </Typography.Text>
        }
        title="会话记录"
      >
        <Table
          className={cn("codex-log-table", "min-w-0", tableScrollbarClassName)}
          columns={columns}
          dataSource={tableRecords}
          onChange={handleTableChange}
          pagination={{
            current: safeTablePage,
            pageSize: tablePageSize,
            pageSizeOptions: ["6", "8", "12"],
            showSizeChanger: true,
            showTotal: (total, range) =>
              `共 ${formatNumber(total)} 条 · ${range[0]}-${range[1]}`,
            total: tableTotal,
          }}
          rowKey="key"
          scroll={{ x: 880, y: 260 }}
          showSorterTooltip={{ target: "sorter-icon" }}
          size="middle"
          tableLayout="fixed"
        />
      </DashboardPanel>
      <SummaryPanel
        date={data.selectedDate}
        initialSummary={data.dailySummary}
      />
    </div>
  );
}

function MetricCard({
  delta,
  hint,
  icon,
  label,
  tone,
  value,
}: {
  delta?: MetricDelta;
  hint?: string;
  icon: string;
  label: string;
  tone: keyof typeof metricToneClassNames;
  value: string;
}) {
  return (
    <Card
      className={cn(
        "codex-log-metric-card min-w-0 border-[color-mix(in_srgb,var(--home-theme-text)_12%,transparent)]! bg-[color-mix(in_srgb,var(--home-theme-bg)_94%,#ffffff_6%)]!",
        panelClassName,
        metricToneClassNames[tone].card,
      )}
      classNames={{
        body: "flex min-h-29.5 w-full items-center gap-4 p-4! md:px-5!",
      }}
    >
      <MetricIcon
        className="!size-14 !rounded-xl"
        iconClassName="!text-3xl"
        name={icon}
        tone={tone}
      />
      <div className="grid min-w-0 gap-2.5">
        <Statistic
          className={cn(
            "codex-log-metric-stat",
            metricToneClassNames[tone].value,
          )}
          title={
            <span
              className={cn(
                "codex-log-metric-label inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-none",
                metricToneClassNames[tone].label,
              )}
            >
              {label}
              {hint ? (
                <Tooltip title={hint}>
                  <QuestionCircleOutlined
                    aria-label={`${label}说明`}
                    className={cn(
                      "codex-log-metric-help",
                      metricToneClassNames[tone].help,
                    )}
                  />
                </Tooltip>
              ) : null}
            </span>
          }
          value={value}
        />
        {delta ? <MetricDeltaLine delta={delta} /> : null}
      </div>
    </Card>
  );
}

function MetricDeltaLine({ delta }: { delta: MetricDelta }) {
  const Icon =
    delta.direction === "up"
      ? ArrowUpOutlined
      : delta.direction === "down"
        ? ArrowDownOutlined
        : MinusOutlined;

  return (
    <span
      className={cn(
        "codex-log-metric-delta inline-flex items-center gap-1 text-sm font-medium leading-none tabular-nums",
        delta.direction === "down"
          ? "text-red-400"
          : delta.direction === "up"
            ? "text-emerald-400"
            : "text-[color-mix(in_srgb,var(--home-theme-text)_54%,transparent)]",
      )}
    >
      <span className="text-[color-mix(in_srgb,var(--home-theme-text)_58%,transparent)]">
        较昨日
      </span>
      <span>{delta.text}</span>
      <Icon aria-hidden className="text-xs" />
    </span>
  );
}
