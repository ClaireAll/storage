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
import type {
  CodexLogDashboardData,
  CodexLogRecord,
  CodexLogRepositoryStat,
  CodexLogTaskStat,
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

function MetricIcon({ name }: { name: string }) {
  return (
    <span className="codex-log-metric-icon">
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
    <div className="codex-log-panel-title">
      {icon}
      <Typography.Title level={5}>{title}</Typography.Title>
    </div>
  );
}

function TaskList({
  emptyText,
  items,
  mode,
}: {
  emptyText: string;
  items: CodexLogRecord[] | CodexLogTaskStat[];
  mode: "frequency" | "token";
}) {
  if (!items.length) {
    return (
      <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );
  }

  return (
    <div className="codex-log-rank-list">
      {items.map((item, index) => {
        const isTokenMode = mode === "token";
        const title = isTokenMode
          ? (item as CodexLogRecord).thread_title
          : (item as CodexLogTaskStat).label;
        const meta = isTokenMode
          ? `${formatToken((item as CodexLogRecord).token_count)} Token`
          : `${(item as CodexLogTaskStat).count} 次`;
        const key = isTokenMode
          ? (item as CodexLogRecord).key
          : `${(item as CodexLogTaskStat).label}-${index}`;

        return (
          <div className="codex-log-rank-item" key={key}>
            <span className="codex-log-rank-index">{index + 1}</span>
            <span className="codex-log-rank-title">{title}</span>
            <span className="codex-log-rank-meta">{meta}</span>
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
    <section className="codex-log-panel codex-log-summary-panel">
      <div className="codex-log-panel-header">
        <PanelTitle icon={<MetricIcon name="icon-codex" />} title="总结" />
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
        <div className="codex-log-summary-grid">
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
    <div className="codex-log-summary-block">
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
      width: 96,
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
      width: 220,
    },
    {
      dataIndex: "user_tasks",
      ellipsis: true,
      title: "任务",
      width: 360,
    },
    {
      dataIndex: "assistant_summary",
      ellipsis: true,
      title: "回答简述",
      width: 420,
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
      width: 112,
    },
  ];

  function handleDateChange(value: Dayjs | null) {
    if (!value) {
      return;
    }

    router.push(`${pathname}?date=${value.format("YYYY-MM-DD")}`);
  }

  return (
    <div className="codex-log-dashboard">
      <div className="codex-log-toolbar">
        <div className="codex-log-page-title">
          <MetricIcon name="icon-codex" />
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

      <section className="codex-log-metric-grid">
        <MetricCard
          icon="icon-task"
          label="任务"
          value={formatNumber(data.stats.taskCount)}
        />
        <MetricCard
          icon="icon-store"
          label="仓库"
          value={formatNumber(data.stats.repositoryCount)}
        />
        <MetricCard
          icon="icon-proportion"
          label="估算占比"
          value={`${data.stats.estimatedRatio}%`}
        />
        <MetricCard
          icon="icon-token"
          hint="来自 codex_log.token_count，是日报入库的任务估算值，不等于 Codex 桌面热力图总使用量。"
          label="入库Token"
          value={formatToken(data.stats.tokenTotal)}
        />
      </section>

      <section className="codex-log-main-grid">
        <section className="codex-log-panel codex-log-chart-panel">
          <PanelTitle title="任务与Token趋势" />
          <CodexChart option={trendOption} />
        </section>
        <section className="codex-log-panel codex-log-chart-panel">
          <PanelTitle title="仓库占比" />
          <CodexChart option={repositoryOption} />
        </section>
      </section>

      <section className="codex-log-side-grid">
        <section className="codex-log-panel">
          <PanelTitle title="高频任务" />
          <TaskList
            emptyText="暂无任务"
            items={data.highFrequencyTasks}
            mode="frequency"
          />
        </section>
        <section className="codex-log-panel">
          <PanelTitle title="最长会话" />
          <TaskList
            emptyText="暂无会话"
            items={data.longestSessions}
            mode="token"
          />
        </section>
      </section>

      <section className="codex-log-panel codex-log-table-panel">
        <div className="codex-log-panel-header">
          <PanelTitle title="会话记录" />
          <Typography.Text type="secondary">
            {formatNumber(filteredRecords.length)} 条
          </Typography.Text>
        </div>
        <Table
          className="codex-log-table"
          columns={columns}
          dataSource={filteredRecords}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
          }}
          rowKey="key"
          scroll={{ x: "max-content" }}
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
  value,
}: {
  hint?: string;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <article className="codex-log-metric-card">
      <MetricIcon name={icon} />
      <div>
        <span className="codex-log-metric-label">
          {label}
          {hint ? (
            <Tooltip title={hint}>
              <QuestionCircleOutlined
                aria-label={`${label}说明`}
                className="codex-log-metric-help"
              />
            </Tooltip>
          ) : null}
        </span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
