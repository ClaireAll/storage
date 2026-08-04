"use client";

import {
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
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
import { cn } from "@/lib/utils";
import type {
  CodexLogDashboardData,
  CodexLogRecord,
  CodexLogRepositoryStat,
  CodexLogTrendPoint,
} from "./codex-log-utils";

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
  "rounded-lg border border-[color-mix(in_srgb,var(--home-theme-color)_26%,transparent)] bg-[color-mix(in_srgb,var(--home-theme-bg)_90%,#ffffff_10%)] shadow-[inset_0_1px_0_rgb(255_255_255/5%)]";
const scrollbarClassName =
  "[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--home-theme-color)_54%,transparent)_color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-[color-mix(in_srgb,var(--home-theme-bg)_88%,#ffffff_12%)] [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--home-theme-color)_54%,transparent)] hover:[&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--home-theme-color)_72%,transparent)]";
const tableScrollbarClassName =
  "[&_.ant-table-content]:overflow-auto [&_.ant-table-body]:overflow-auto [&_.ant-table-content]:[scrollbar-width:thin] [&_.ant-table-body]:[scrollbar-width:thin] [&_.ant-table-content::-webkit-scrollbar]:h-2 [&_.ant-table-content::-webkit-scrollbar]:w-2 [&_.ant-table-body::-webkit-scrollbar]:h-2 [&_.ant-table-body::-webkit-scrollbar]:w-2 [&_.ant-table-content::-webkit-scrollbar-thumb]:rounded-full [&_.ant-table-body::-webkit-scrollbar-thumb]:rounded-full [&_.ant-table-content::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--home-theme-color)_54%,transparent)] [&_.ant-table-body::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--home-theme-color)_54%,transparent)]";
const metricToneClassNames = {
  codex: {
    card: "!border-[color-mix(in_srgb,#18f83a_50%,transparent)] !bg-[color-mix(in_srgb,#18f83a_9%,var(--home-theme-bg)_91%)]",
    help: "!text-[color-mix(in_srgb,#18f83a_76%,var(--home-theme-text)_24%)]",
    icon: "!border-[color-mix(in_srgb,#18f83a_52%,transparent)] !bg-[color-mix(in_srgb,#18f83a_16%,transparent)] !text-[#18f83a]",
    label: "!text-[color-mix(in_srgb,#18f83a_76%,var(--home-theme-text)_24%)]",
    value: "!text-[color-mix(in_srgb,#18f83a_82%,var(--home-theme-text)_18%)]",
  },
  neutral: {
    card: "!border-[color-mix(in_srgb,#6f7378_38%,transparent)] !bg-[color-mix(in_srgb,#6f7378_8%,var(--home-theme-bg)_92%)]",
    help: "!text-[color-mix(in_srgb,#6f7378_72%,var(--home-theme-text)_28%)]",
    icon: "!border-[color-mix(in_srgb,#6f7378_38%,transparent)] !bg-[color-mix(in_srgb,#6f7378_14%,transparent)] !text-[#6f7378]",
    label: "!text-[color-mix(in_srgb,#6f7378_72%,var(--home-theme-text)_28%)]",
    value: "!text-[color-mix(in_srgb,#6f7378_84%,var(--home-theme-text)_16%)]",
  },
  proportion: {
    card: "!border-[color-mix(in_srgb,#f59e0b_48%,transparent)] !bg-[color-mix(in_srgb,#f59e0b_9%,var(--home-theme-bg)_91%)]",
    help: "!text-[color-mix(in_srgb,#f59e0b_74%,var(--home-theme-text)_26%)]",
    icon: "!border-[color-mix(in_srgb,#f59e0b_50%,transparent)] !bg-[color-mix(in_srgb,#f59e0b_16%,transparent)] !text-[#f59e0b]",
    label: "!text-[color-mix(in_srgb,#f59e0b_74%,var(--home-theme-text)_26%)]",
    value: "!text-[color-mix(in_srgb,#f59e0b_82%,var(--home-theme-text)_18%)]",
  },
  store: {
    card: "!border-[color-mix(in_srgb,#a78bfa_48%,transparent)] !bg-[color-mix(in_srgb,#a78bfa_9%,var(--home-theme-bg)_91%)]",
    help: "!text-[color-mix(in_srgb,#a78bfa_76%,var(--home-theme-text)_24%)]",
    icon: "!border-[color-mix(in_srgb,#a78bfa_50%,transparent)] !bg-[color-mix(in_srgb,#a78bfa_16%,transparent)] !text-[#a78bfa]",
    label: "!text-[color-mix(in_srgb,#a78bfa_76%,var(--home-theme-text)_24%)]",
    value: "!text-[color-mix(in_srgb,#a78bfa_84%,var(--home-theme-text)_16%)]",
  },
  task: {
    card: "!border-[color-mix(in_srgb,#3b82f6_48%,transparent)] !bg-[color-mix(in_srgb,#3b82f6_9%,var(--home-theme-bg)_91%)]",
    help: "!text-[color-mix(in_srgb,#3b82f6_76%,var(--home-theme-text)_24%)]",
    icon: "!border-[color-mix(in_srgb,#3b82f6_50%,transparent)] !bg-[color-mix(in_srgb,#3b82f6_16%,transparent)] !text-[#3b82f6]",
    label: "!text-[color-mix(in_srgb,#3b82f6_76%,var(--home-theme-text)_24%)]",
    value: "!text-[color-mix(in_srgb,#3b82f6_84%,var(--home-theme-text)_16%)]",
  },
  token: {
    card: "!border-[color-mix(in_srgb,#22c55e_48%,transparent)] !bg-[color-mix(in_srgb,#22c55e_9%,var(--home-theme-bg)_91%)]",
    help: "!text-[color-mix(in_srgb,#22c55e_76%,var(--home-theme-text)_24%)]",
    icon: "!border-[color-mix(in_srgb,#22c55e_50%,transparent)] !bg-[color-mix(in_srgb,#22c55e_16%,transparent)] !text-[#22c55e]",
    label: "!text-[color-mix(in_srgb,#22c55e_76%,var(--home-theme-text)_24%)]",
    value: "!text-[color-mix(in_srgb,#22c55e_84%,var(--home-theme-text)_16%)]",
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
  name,
  tone = "neutral",
}: {
  name: string;
  tone?: keyof typeof metricToneClassNames;
}) {
  return (
    <span className={cn("codex-log-metric-icon", metricToneClassNames[tone].icon)}>
      <i aria-hidden className={`iconfont ${name}`} />
    </span>
  );
}

function CodexChart({ option }: { option: ChartOption }) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chart = echarts.init(chartRef.current);
    chart.setOption(option);

    function resizeChart() {
      chart.resize();
    }

    window.addEventListener("resize", resizeChart);

    return () => {
      window.removeEventListener("resize", resizeChart);
      chart.dispose();
    };
  }, [option]);

  return <div className="codex-log-chart" ref={chartRef} />;
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
    <div className="codex-log-panel-title min-w-0 items-center gap-2">
      {icon}
      <Typography.Title level={5}>{title}</Typography.Title>
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
  if (!items.length) {
    return (
      <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  return (
    <div className={cn("codex-log-rank-list", scrollbarClassName)}>
      {items.map((item, index) => {
        return (
          <div className="codex-log-rank-item" key={item.key}>
            <span className="codex-log-rank-index">{index + 1}</span>
            <span className="codex-log-rank-title">{item.thread_title}</span>
            <span className="codex-log-rank-meta">
              {formatToken(item.token_count)} Token
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryPanel({ date }: { date: string }) {
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: "idle",
  });

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
    const controller = new AbortController();
    const timerId = window.setTimeout(() => {
      void loadSummary(controller.signal);
    });

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [loadSummary]);

  return (
    <section
      className={cn(
        "codex-log-panel codex-log-summary-panel min-w-0 p-3",
        panelClassName,
      )}
    >
      <div className="codex-log-panel-header">
        <PanelTitle
          icon={<MetricIcon name="icon-codex" tone="codex" />}
          title="总结"
        />
        <Button
          icon={<ReloadOutlined />}
          loading={summaryState.status === "loading"}
          onClick={() => void loadSummary()}
          size="small"
          type="text"
        />
      </div>
      {summaryState.status === "loading" ? (
        <div className="codex-log-summary-loading">
          <Spin size="small" />
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
    </section>
  );
}

function SummaryBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="codex-log-summary-block min-w-0 rounded-lg p-3">
      <span>{label}</span>
      <Typography.Paragraph>{text}</Typography.Paragraph>
    </div>
  );
}

export function CodexLogDashboard({ data }: CodexLogDashboardProps) {
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
  const columns: TableColumnsType<CodexLogRecord> = [
    {
      dataIndex: "time",
      filters: hourFilters,
      onFilter: (value, record) =>
        getHourFilterValue(record.hour) === String(value),
      title: "时间",
      width: 86,
    },
    {
      dataIndex: "thread_title",
      render: (value: string, record) => (
        <Space className="codex-log-title-cell" size={8}>
          <Tag>{record.repository}</Tag>
          <span>{value}</span>
        </Space>
      ),
      title: "会话",
      width: 180,
    },
    {
      dataIndex: "user_tasks",
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Typography.Text className="block max-w-[240px]" ellipsis={{ tooltip: value }}>
          {value}
        </Typography.Text>
      ),
      title: "任务",
      width: 260,
    },
    {
      dataIndex: "assistant_summary",
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Typography.Text className="block max-w-[260px]" ellipsis={{ tooltip: value }}>
          {value}
        </Typography.Text>
      ),
      title: "回答简述",
      width: 280,
    },
    {
      align: "right",
      dataIndex: "token_count",
      filters: tokenFilters,
      onFilter: (value, record) =>
        getTokenFilterValue(record.token_count) === String(value),
      render: (value: number) => formatToken(value),
      sorter: (left, right) => left.token_count - right.token_count,
      title: "Token",
      width: 104,
    },
  ];

  function handleDateChange(value: Dayjs | null) {
    if (!value) {
      return;
    }

    router.push(`${pathname}?date=${value.format("YYYY-MM-DD")}`);
  }

  return (
    <div
      className={cn(
        "codex-log-dashboard min-w-0 overflow-auto",
        scrollbarClassName,
      )}
    >
      <div className={cn("codex-log-toolbar", panelClassName, "p-3")}>
        <div className="codex-log-page-title">
          <MetricIcon name="icon-codex" tone="codex" />
          <div>
            <Typography.Title level={4}>Codex日报</Typography.Title>
            <Typography.Text type="secondary">
              {data.selectedDate} · {formatNumber(data.stats.taskCount)} 个任务
            </Typography.Text>
          </div>
        </div>
        <Space wrap>
          <DatePicker
            allowClear={false}
            className="codex-log-date-picker"
            disabledDate={(current) =>
              !data.availableDates.includes(current.format("YYYY-MM-DD"))
            }
            onChange={handleDateChange}
            value={selectedDay.isValid() ? selectedDay : undefined}
          />
          <Select
            className="codex-log-repo-select"
            onChange={setRepository}
            options={repositoryOptions}
            value={repository}
          />
          <Input
            allowClear
            className="codex-log-search"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索任务或回答"
            prefix={<SearchOutlined />}
            value={keyword}
          />
          <Button
            icon={<SyncOutlined />}
            onClick={() => router.refresh()}
            type="text"
          />
        </Space>
      </div>

      <section className="codex-log-metric-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="icon-task"
          label="任务"
          tone="task"
          value={formatNumber(data.stats.taskCount)}
        />
        <MetricCard
          icon="icon-store"
          label="仓库"
          tone="store"
          value={formatNumber(data.stats.repositoryCount)}
        />
        <MetricCard
          icon="icon-proportion"
          label="估算占比"
          tone="proportion"
          value={`${data.stats.estimatedRatio}%`}
        />
        <MetricCard
          icon="icon-token"
          hint={tokenHint}
          label="入库Token"
          tone="token"
          value={formatToken(data.stats.tokenTotal)}
        />
      </section>

      <section className="codex-log-analysis-grid grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)_minmax(260px,0.8fr)]">
        <section
          className={cn(
            "codex-log-panel codex-log-chart-panel min-w-0 p-3",
            panelClassName,
          )}
        >
          <PanelTitle title="任务与Token趋势" />
          <CodexChart option={trendOption} />
        </section>
        <section
          className={cn(
            "codex-log-panel codex-log-chart-panel min-w-0 p-3",
            panelClassName,
          )}
        >
          <PanelTitle title="仓库占比" />
          <CodexChart option={repositoryOption} />
        </section>
        <section className={cn("codex-log-panel min-w-0 p-3", panelClassName)}>
          <PanelTitle title="最长会话" />
          <TaskList emptyText="暂无会话" items={data.longestSessions} />
        </section>
      </section>

      <section
        className={cn(
          "codex-log-panel codex-log-table-panel min-w-0 overflow-hidden p-3",
          panelClassName,
        )}
      >
        <div className="codex-log-panel-header">
          <PanelTitle title="会话记录" />
          <Typography.Text type="secondary">
            {formatNumber(filteredRecords.length)} 条
          </Typography.Text>
        </div>
        <Table
          className={cn("codex-log-table", "min-w-0", tableScrollbarClassName)}
          columns={columns}
          dataSource={filteredRecords}
          pagination={{
            pageSize: 6,
            pageSizeOptions: ["6", "8", "12"],
            showSizeChanger: true,
            showTotal: (total, range) =>
              `共 ${formatNumber(total)} 条 · ${range[0]}-${range[1]}`,
          }}
          rowKey="key"
          scroll={{ x: 860, y: 300 }}
          size="middle"
          tableLayout="fixed"
        />
      </section>
      <SummaryPanel date={data.selectedDate} />
    </div>
  );
}

function MetricCard({
  hint,
  icon,
  label,
  tone,
  value,
}: {
  hint?: string;
  icon: string;
  label: string;
  tone: keyof typeof metricToneClassNames;
  value: string;
}) {
  return (
    <article
      className={cn(
        "codex-log-metric-card min-w-0 rounded-lg p-3",
        panelClassName,
        metricToneClassNames[tone].card,
      )}
    >
      <MetricIcon name={icon} tone={tone} />
      <div>
        <span className={cn("codex-log-metric-label", metricToneClassNames[tone].label)}>
          {label}
          {hint ? (
            <Tooltip title={hint}>
              <QuestionCircleOutlined
                aria-label={`${label}说明`}
                className={cn("codex-log-metric-help", metricToneClassNames[tone].help)}
              />
            </Tooltip>
          ) : null}
        </span>
        <strong className={metricToneClassNames[tone].value}>{value}</strong>
      </div>
    </article>
  );
}
