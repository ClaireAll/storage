"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { themeConfigChangeEventName } from "@/app/(pages)/theme/constants";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { cn } from "@/lib/utils";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  MinusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Input,
  Select,
  Statistic,
  Timeline,
  Tooltip,
  Typography,
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
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  CodexLogDashboardData,
  CodexLogRecord,
  CodexLogRepositoryStat,
  CodexLogTrendPoint,
} from "./codex-log-utils";
import {
  HomeContentFullscreenButton,
  useHomeContentFullscreen,
} from "../home-content-fullscreen";

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

type CodexDailySummary = {
  growth: string;
  shortage: string;
  summary: string;
};

type ChartPalette = {
  accent: string;
  border: string;
  columns: string[];
  muted: string;
  surface: string;
  text: string;
};

type MetricDelta = {
  direction: "down" | "flat" | "up";
  text: string;
};

const defaultPalette: ChartPalette = {
  accent: "#22c55e",
  border: "rgba(34, 197, 94, 0.32)",
  columns: [
    "#22c55e",
    "#38bdf8",
    "#f59e0b",
    "#a78bfa",
    "#f472b6",
    "#2dd4bf",
    "#fb7185",
    "#84cc16",
  ],
  muted: "rgba(107, 114, 128, 0.78)",
  surface: "#ffffff",
  text: "#111827",
};
// Preview border rule: panels 22%, quiet nested surfaces 18%, row dividers 14%.
const codexLogBorderClassNames = {
  divider: "!my-0 !border-[color:var(--home-preview-divider-color)]",
  panel: "border-[color:var(--home-preview-border-color)]",
  panelImportant: "border-[color:var(--home-preview-border-color)]!",
  quietPanel: "border-[color:var(--home-preview-border-soft-color)]",
};
const panelClassName = cn(
  "rounded-lg border bg-[color-mix(in_srgb,var(--home-theme-bg)_94%,#ffffff_6%)] shadow-sm",
  codexLogBorderClassNames.panel,
);
const quietPanelClassName = cn(
  "rounded-lg border bg-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)]",
  codexLogBorderClassNames.quietPanel,
);
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

function getChartColumns(value: string) {
  const columns = value
    .split(",")
    .map((color) => color.trim())
    .filter(Boolean);

  return columns.length > 0 ? columns : defaultPalette.columns;
}

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

function getRecordTimestamp(record: CodexLogRecord) {
  const value = record.created_at ? new Date(record.created_at).getTime() : 0;

  return Number.isNaN(value) ? 0 : value;
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
    columns: getChartColumns(
      readVar("--home-theme-columns", defaultPalette.columns.join(",")),
    ),
    surface: readVar("--home-theme-bg", defaultPalette.surface),
    text: readVar("--home-theme-text", defaultPalette.text),
  };
}

function useChartPalette() {
  const [palette, setPalette] = useState<ChartPalette>(defaultPalette);

  useEffect(() => {
    const syncPalette = () => {
      setPalette(readThemePalette());
    };
    const root =
      document.querySelector<HTMLElement>(".home-shell") ??
      document.documentElement;
    const frameId = window.requestAnimationFrame(syncPalette);
    const observer = new MutationObserver(syncPalette);

    observer.observe(root, {
      attributeFilter: ["style"],
      attributes: true,
    });
    window.addEventListener(themeConfigChangeEventName, syncPalette);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener(themeConfigChangeEventName, syncPalette);
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
  const chartColumns = getChartColumns(palette.columns.join(","));

  return {
    color: [chartColumns[0], chartColumns[1] ?? chartColumns[0]],
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
        data: trend.map((item, index) => ({
          itemStyle: {
            color: chartColumns[index % chartColumns.length],
          },
          value: item.taskCount,
        })),
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
      <Typography.Title className="mb-0! text-base! text-balance" level={5}>
        {title}
      </Typography.Title>
    </div>
  );
}

function LongestSessionList({
  emptyText,
  items,
  palette,
}: {
  emptyText: string;
  items: CodexLogRecord[];
  palette: ChartPalette;
}) {
  if (items.length === 0) {
    return (
      <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  const repositoryToneMap = new Map<string, string>();

  items.forEach((item) => {
    if (!repositoryToneMap.has(item.repository)) {
      const nextIndex = repositoryToneMap.size % palette.columns.length;

      repositoryToneMap.set(
        item.repository,
        palette.columns[nextIndex] ?? palette.accent,
      );
    }
  });

  return (
    <div className="codex-log-longest-list flex min-h-0 flex-1 flex-col">
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item, index) => {
          const tone = repositoryToneMap.get(item.repository) ?? palette.accent;

          return (
            <Fragment key={item.key}>
              <li className="codex-log-longest-row flex min-h-14 items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <span className="codex-log-longest-title block truncate text-sm font-semibold text-(--home-theme-text)">
                    {item.thread_title}
                  </span>
                  <span
                    className="codex-log-longest-repository mt-1 block truncate text-xs font-semibold"
                    style={{ color: tone }}
                  >
                    {item.repository}
                  </span>
                </div>
                <span className="codex-log-longest-meta inline-flex shrink-0 items-center gap-1 whitespace-nowrap pt-0.5 text-xs font-medium tabular-nums text-[color-mix(in_srgb,var(--home-theme-text)_58%,transparent)]">
                  <ClockCircleOutlined className="text-[13px]" />
                  {formatToken(item.token_count)} Token
                </span>
              </li>
              {index < items.length - 1 ? (
                <Divider className={codexLogBorderClassNames.divider} />
              ) : null}
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryPanel({ initialSummary }: { initialSummary: CodexDailySummary | null }) {
  return (
    <DashboardPanel
      className="codex-log-summary-panel min-h-60 shrink-0"
      icon={<MetricIcon name="icon-codex" tone="codex" />}
      title="总结"
    >
      {initialSummary ? (
        <div className="codex-log-summary-grid grid grid-cols-1 gap-3 lg:grid-cols-3">
          <SummaryBlock label="总结" text={initialSummary.summary} />
          <SummaryBlock label="成长" text={initialSummary.growth} />
          <SummaryBlock label="不足" text={initialSummary.shortage} />
        </div>
      ) : (
        <Empty description="暂无日报总结" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
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
      <Typography.Paragraph className="mb-0! text-pretty">
        {text}
      </Typography.Paragraph>
    </div>
  );
}

function SessionTimeline({
  palette,
  records,
}: {
  palette: ChartPalette;
  records: CodexLogRecord[];
}) {
  if (!records.length) {
    return <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <Timeline
      className="codex-log-session-timeline mb-0! [&_.ant-timeline-item-content]:min-w-0! [&_.ant-timeline-item-label]:text-start! [&_.ant-timeline-item-tail]:border-[color:var(--home-preview-divider-color)]!"
      items={records.map((record, index) => {
        const recordColor =
          palette.columns[index % palette.columns.length] ?? palette.accent;
        const sessionCardStyle: CSSProperties &
          Record<"--codex-log-session-color", string> = {
          "--codex-log-session-color": recordColor,
        };

        return {
          content: (
            <div
              className={cn(
                "codex-log-session-card inline-flex w-fit max-w-[min(32rem,100%)] min-w-0 items-baseline justify-between gap-3 px-3 py-2.5 text-left max-sm:flex-col max-sm:items-start max-sm:gap-2",
                quietPanelClassName,
                "border-0 bg-[color-mix(in_srgb,var(--codex-log-session-color)_14%,transparent)] dark:bg-[color-mix(in_srgb,var(--codex-log-session-color)_18%,transparent)]",
              )}
              style={sessionCardStyle}
            >
              <Typography.Text className="min-w-0 flex-1 wrap-break-word whitespace-normal text-pretty leading-5 text-(--home-theme-text)!">
                {record.thread_title}
              </Typography.Text>
              <span className="shrink-0 whitespace-nowrap text-xs font-medium leading-5 tabular-nums text-[color-mix(in_srgb,var(--home-theme-text)_58%,transparent)]">
                {formatToken(record.token_count)} Token
              </span>
            </div>
          ),
          color: recordColor,
          key: record.key,
          title: (
            <span className="text-sm font-medium tabular-nums text-[color-mix(in_srgb,var(--home-theme-text)_62%,transparent)]">
              {record.time}
            </span>
          ),
        };
      })}
      mode="alternate"
    />
  );
}

export function CodexLogDashboard({ data }: CodexLogDashboardProps) {
  const fullscreen = useHomeContentFullscreen();
  const router = useRouter();
  const pathname = usePathname();
  const palette = useChartPalette();
  const [keyword, setKeyword] = useState("");
  const [repository, setRepository] = useState<string>("all");
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
        !lowerKeyword || record.thread_title.toLowerCase().includes(lowerKeyword);

      return matchesRepository && matchesKeyword;
    });
  }, [data.records, keyword, repository]);
  const timelineRecords = useMemo(
    () =>
      [...filteredRecords].sort(
        (left, right) => getRecordTimestamp(right) - getRecordTimestamp(left),
      ),
    [filteredRecords],
  );

  function handleDateChange(value: Dayjs | null) {
    if (!value) {
      return;
    }

    router.push(`${pathname}?date=${value.format("YYYY-MM-DD")}`);
  }

  return (
    <OverlayScrollArea
      className="codex-log-dashboard-shell @container/codex-log h-full min-h-0 w-full min-w-0 flex-1"
      data-scroll-pauses-background={
        fullscreen?.isFullscreen ? "true" : undefined
      }
      horizontal
      viewportClassName="codex-log-dashboard flex min-h-0 min-w-0 flex-col gap-4 overflow-x-auto p-1 md:gap-5"
    >
      <div
        className={cn(
          "codex-log-toolbar grid grid-cols-1 items-start gap-4 p-4 md:p-5 @5xl/codex-log:flex @5xl/codex-log:items-center @5xl/codex-log:justify-between",
          panelClassName,
        )}
      >
        <div className="codex-log-page-title flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,#18f83a_50%,transparent)] bg-[color-mix(in_srgb,#18f83a_14%,transparent)]">
            <CategoryIcon
              className="size-7"
              hasPadding={false}
              iconClassName="size-7"
              mode="symbol"
              name="icon-daily-report"
            />
          </span>
          <div className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <Typography.Title className="mb-0! text-xl! text-balance" level={4}>
                日报
              </Typography.Title>
              <span className="hidden @5xl/codex-log:contents">
                <HomeContentFullscreenButton />
              </span>
            </div>
            <Typography.Title className="hidden!" level={4}>
              Codex日报
            </Typography.Title>
            <Typography.Text type="secondary">
              {data.selectedDate} · {formatNumber(data.stats.taskCount)} 个任务
            </Typography.Text>
          </div>
        </div>
        <div className="codex-log-toolbar-actions grid w-full min-w-0 grid-cols-[minmax(0,1fr)_40px] gap-2 @3xl/codex-log:grid-cols-[160px_minmax(160px,1fr)_minmax(180px,1.2fr)_40px] @5xl/codex-log:w-180">
          <DatePicker
            allowClear={false}
            className="codex-log-date-picker col-span-2 w-full @3xl/codex-log:col-span-1"
            disabledDate={(current) =>
              !data.availableDates.includes(current.format("YYYY-MM-DD"))
            }
            onChange={handleDateChange}
            value={selectedDay.isValid() ? selectedDay : undefined}
          />
              <Select
                className="codex-log-repo-select col-span-2 w-full @3xl/codex-log:col-span-1"
                onChange={setRepository}
                options={repositoryOptions}
                value={repository}
              />
          <Input
                allowClear
                className="col-span-1 w-full @3xl/codex-log:col-span-1"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索会话"
                prefix={<SearchOutlined />}
                value={keyword}
              />
          <Button
            aria-label="刷新日报"
            className="col-span-1 w-full @3xl/codex-log:col-span-1"
            icon={<SyncOutlined />}
            onClick={() => router.refresh()}
            type="text"
          />
        </div>
      </div>

      <section className="codex-log-metric-grid flex w-full flex-nowrap gap-3">
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
      </section>

      <section className="codex-log-analysis-grid grid grid-cols-1 gap-4 @7xl/codex-log:grid-cols-[minmax(420px,1.35fr)_minmax(300px,0.9fr)_minmax(300px,0.95fr)]">
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
          <LongestSessionList
            emptyText="暂无会话"
            items={data.longestSessions}
            palette={palette}
          />
        </DashboardPanel>
      </section>

      <DashboardPanel
        className="codex-log-session-panel shrink-0"
        extra={
          <Typography.Text type="secondary">
            {formatNumber(timelineRecords.length)} 条
          </Typography.Text>
        }
        title="会话记录"
      >
        <SessionTimeline palette={palette} records={timelineRecords} />
      </DashboardPanel>
      <SummaryPanel initialSummary={data.dailySummary} />
    </OverlayScrollArea>
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
        "codex-log-metric-card flex-1 basis-0 min-w-0 bg-[color-mix(in_srgb,var(--home-theme-bg)_94%,#ffffff_6%)]!",
        codexLogBorderClassNames.panelImportant,
        panelClassName,
        metricToneClassNames[tone].card,
      )}
      classNames={{
        body: "flex min-h-29.5 w-full items-center gap-4 p-4! md:px-5!",
      }}
    >
      <MetricIcon
        className="size-14! rounded-xl!"
        iconClassName="text-3xl!"
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
