
import type { DatabaseClient } from "@/app/utils/database";

export type CodexLogRecord = {
  assistant_summary: string;
  category: number;
  created_at: string | null;
  date: string;
  hour: number | null;
  isEstimated: boolean;
  key: string;
  repository: string;
  thread_title: string;
  time: string;
  token_count: number;
  user_tasks: string;
};

export type CodexLogTaskStat = {
  count: number;
  label: string;
  tokenTotal: number;
};

export type CodexLogTrendPoint = {
  date: string;
  label: string;
  taskCount: number;
  tokenTotal: number;
};

export type CodexLogRepositoryStat = {
  category: number;
  label: string;
  taskCount: number;
  tokenTotal: number;
};

export type CodexDailySummary = {
  growth: string;
  shortage: string;
  summary: string;
};

export type CodexLogDashboardData = {
  availableDates: string[];
  dailySummary: CodexDailySummary | null;
  highFrequencyTasks: CodexLogTaskStat[];
  longestSessions: CodexLogRecord[];
  records: CodexLogRecord[];
  repositoryDistribution: CodexLogRepositoryStat[];
  selectedDate: string;
  stats: {
    databaseTokenTotal: number;
    estimatedRatio: number;
    previous: {
      estimatedRatio: number;
      repositoryCount: number;
      taskCount: number;
      tokenTotal: number;
    };
    repositoryCount: number;
    taskCount: number;
    tokenSource: "database" | "desktop";
    tokenTotal: number;
  };
  trend: CodexLogTrendPoint[];
};

type CodexLogRow = {
  assistant_summary: string | null;
  category: number | null;
  created_at: string | null;
  date: string | null;
  r_id: string | null;
  thread_title: string | null;
  token_count: number | null;
  user_tasks: string | null;
};

type CodexDailyReportRow = {
  date: string | null;
  desktop_token_total: number | null;
  growth: string | null;
  shortage: string | null;
  summary: string | null;
  summary_generated_at: string | null;
  token_calculated_at: string | null;
};

const codexLogCategoryLabels: Record<number, string> = {
  1: "fx-data-web / fv-web2",
  2: "skills",
  3: "chrome-plugin",
  4: "Storage",
  5: "2026",
  6: "money-tool",
  7: "fd-biz",
  10000: "其它",
};

const trendDayCount = 7;
const recentDateLimit = 90;

function getShanghaiToday() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate.toISOString().slice(0, 10);
}

function formatDateLabel(date: string) {
  const [, month = "", day = ""] = date.match(/^\d{4}-(\d{2})-(\d{2})$/) ?? [];

  return month && day ? `${Number(month)}/${Number(day)}` : date;
}

function toCleanText(value: string | null | undefined, fallback = "") {
  return (value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function toTokenCount(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(Number(value))) : 0;
}


function getCategoryLabel(category: number | null | undefined) {
  return codexLogCategoryLabels[category ?? 10000] ?? codexLogCategoryLabels[10000];
}

function formatShanghaiTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function getShanghaiHour(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    }).format(date),
  );
}

function mapCodexLogRow(row: CodexLogRow, index: number): CodexLogRecord {
  const category = row.category ?? 10000;
  const tokenCount = toTokenCount(row.token_count);

  return {
    assistant_summary: toCleanText(row.assistant_summary, "暂无总结"),
    category,
    created_at: row.created_at,
    date: row.date ?? getShanghaiToday(),
    hour: getShanghaiHour(row.created_at),
    isEstimated: tokenCount > 0 && tokenCount < 10000,
    key: row.r_id ?? `${row.date ?? "unknown"}-${index}`,
    repository: getCategoryLabel(category),
    thread_title: toCleanText(row.thread_title, "未命名任务"),
    time: formatShanghaiTime(row.created_at),
    token_count: tokenCount,
    user_tasks: toCleanText(row.user_tasks, "暂无任务描述"),
  };
}

function buildRepositoryDistribution(records: CodexLogRecord[]) {
  const grouped = new Map<number, CodexLogRepositoryStat>();

  records.forEach((record) => {
    const current = grouped.get(record.category) ?? {
      category: record.category,
      label: record.repository,
      taskCount: 0,
      tokenTotal: 0,
    };

    current.taskCount += 1;
    current.tokenTotal += record.token_count;
    grouped.set(record.category, current);
  });

  return Array.from(grouped.values()).sort(
    (left, right) => right.taskCount - left.taskCount,
  );
}

function buildTrend(
  rows: CodexLogRow[],
  selectedDate: string,
  desktopUsageTotals?: Map<string, number> | null,
) {
  const dayMap = new Map<string, CodexLogTrendPoint>();

  for (let index = trendDayCount - 1; index >= 0; index -= 1) {
    const date = addDays(selectedDate, -index);
    dayMap.set(date, {
      date,
      label: formatDateLabel(date),
      taskCount: 0,
      tokenTotal: 0,
    });
  }

  rows.forEach((row) => {
    const date = row.date ?? "";
    const point = dayMap.get(date);

    if (!point) {
      return;
    }

    point.taskCount += 1;
    point.tokenTotal += toTokenCount(row.token_count);
  });

  if (desktopUsageTotals) {
    dayMap.forEach((point, date) => {
      const desktopTokenTotal = desktopUsageTotals.get(date);

      if (desktopTokenTotal !== undefined) {
        point.tokenTotal = desktopTokenTotal;
      }
    });
  }

  return Array.from(dayMap.values());
}

function getCachedDailySummary(
  report: CodexDailyReportRow | undefined,
): CodexDailySummary | null {
  if (!report?.summary_generated_at) {
    return null;
  }

  const summary = toCleanText(report.summary);
  const growth = toCleanText(report.growth);
  const shortage = toCleanText(report.shortage);

  return summary && growth && shortage ? { growth, shortage, summary } : null;
}

function getTaskLabel(record: CodexLogRecord) {
  const source = record.user_tasks || record.thread_title;
  const firstSentence =
    source.split(/[。！？!?；;]/).find((item) => item.trim()) ?? source;

  return firstSentence.trim().slice(0, 24) || "未命名任务";
}

function buildHighFrequencyTasks(records: CodexLogRecord[]) {
  const grouped = new Map<string, CodexLogTaskStat>();

  records.forEach((record) => {
    const label = getTaskLabel(record);
    const current = grouped.get(label) ?? {
      count: 0,
      label,
      tokenTotal: 0,
    };

    current.count += 1;
    current.tokenTotal += record.token_count;
    grouped.set(label, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count || right.tokenTotal - left.tokenTotal)
    .slice(0, 5);
}

function buildStatSnapshot(
  records: CodexLogRecord[],
  tokenTotalOverride?: number,
) {
  const repositoryDistribution = buildRepositoryDistribution(records);
  const estimatedCount = records.filter((record) => record.isEstimated).length;
  const databaseTokenTotal = records.reduce(
    (total, record) => total + record.token_count,
    0,
  );

  return {
    databaseTokenTotal,
    estimatedRatio: records.length
      ? Math.round((estimatedCount / records.length) * 100)
      : 0,
    repositoryCount: repositoryDistribution.length,
    taskCount: records.length,
    tokenTotal: tokenTotalOverride ?? databaseTokenTotal,
  };
}

function getEmptyDashboardData(selectedDate = getShanghaiToday()): CodexLogDashboardData {
  return {
    availableDates: [selectedDate],
    dailySummary: null,
    highFrequencyTasks: [],
    longestSessions: [],
    records: [],
    repositoryDistribution: [],
    selectedDate,
    stats: {
      databaseTokenTotal: 0,
      estimatedRatio: 0,
      previous: {
        estimatedRatio: 0,
        repositoryCount: 0,
        taskCount: 0,
        tokenTotal: 0,
      },
      repositoryCount: 0,
      taskCount: 0,
      tokenSource: "database",
      tokenTotal: 0,
    },
    trend: buildTrend([], selectedDate),
  };
}

async function resolveSelectedDate(
  supabase: DatabaseClient,
  userId: string,
  date?: string,
) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const { data } = await supabase
    .from("codex_log")
    .select("date")
    .eq("id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .returns<Pick<CodexLogRow, "date">[]>();

  return data?.[0]?.date ?? getShanghaiToday();
}

export async function listCodexLogDashboard(
  supabase: DatabaseClient,
  userId: string,
  date?: string,
): Promise<CodexLogDashboardData> {
  const selectedDate = await resolveSelectedDate(supabase, userId, date);
  const previousDate = addDays(selectedDate, -1);
  const trendStartDate = addDays(selectedDate, -(trendDayCount - 1));

  const [recordRangeResult, dateResult, dailyReportResult] = await Promise.all([
    supabase
      .from("codex_log")
      .select(
        "r_id,id,date,thread_title,user_tasks,assistant_summary,created_at,category,token_count",
      )
      .eq("id", userId)
      .gte("date", trendStartDate)
      .lte("date", selectedDate)
      .order("created_at", { ascending: true })
      .returns<CodexLogRow[]>(),
    supabase
      .from("codex_log")
      .select("date")
      .eq("id", userId)
      .order("date", { ascending: false })
      .limit(recentDateLimit)
      .returns<Pick<CodexLogRow, "date">[]>(),
    supabase
      .from("codex_daily_report")
      .select(
        "date,desktop_token_total,token_calculated_at,summary,growth,shortage,summary_generated_at",
      )
      .eq("id", userId)
      .gte("date", trendStartDate)
      .lte("date", selectedDate)
      .returns<CodexDailyReportRow[]>(),
  ]);

  if (recordRangeResult.error) {
    return getEmptyDashboardData(selectedDate);
  }

  const recordRows = recordRangeResult.data ?? [];
  const records = recordRows
    .filter((row) => row.date === selectedDate)
    .map(mapCodexLogRow);
  const previousRecords = recordRows
    .filter((row) => row.date === previousDate)
    .map(mapCodexLogRow);
  const repositoryDistribution = buildRepositoryDistribution(records);
  const cachedReportsByDate = new Map(
    (dailyReportResult.data ?? [])
      .filter((report): report is CodexDailyReportRow & { date: string } =>
        Boolean(report.date),
      )
      .map((report) => [report.date, report]),
  );
  const desktopUsageTotals = new Map<string, number>();

  cachedReportsByDate.forEach((report, reportDate) => {
    if (report.token_calculated_at) {
      desktopUsageTotals.set(
        reportDate,
        toTokenCount(report?.desktop_token_total),
      );
    }
  });

  const desktopTokenTotal = desktopUsageTotals?.get(selectedDate);
  const previousDesktopTokenTotal = desktopUsageTotals?.get(previousDate);
  const currentStats = buildStatSnapshot(records, desktopTokenTotal);
  const previousStats = buildStatSnapshot(
    previousRecords,
    previousDesktopTokenTotal,
  );
  const tokenSource: "database" | "desktop" =
    desktopTokenTotal === undefined ? "database" : "desktop";

  return {
    availableDates: Array.from(
      new Set([
        selectedDate,
        ...(dateResult.data ?? [])
          .map((row) => row.date)
          .filter((value): value is string => Boolean(value)),
      ]),
    ),
    dailySummary: getCachedDailySummary(
      cachedReportsByDate.get(selectedDate),
    ),
    highFrequencyTasks: buildHighFrequencyTasks(records),
    longestSessions: [...records]
      .sort((left, right) => right.token_count - left.token_count)
      .slice(0, 5),
    records,
    repositoryDistribution,
    selectedDate,
    stats: {
      databaseTokenTotal: currentStats.databaseTokenTotal,
      estimatedRatio: currentStats.estimatedRatio,
      previous: {
        estimatedRatio: previousStats.estimatedRatio,
        repositoryCount: previousStats.repositoryCount,
        taskCount: previousStats.taskCount,
        tokenTotal: previousStats.tokenTotal,
      },
      repositoryCount: currentStats.repositoryCount,
      taskCount: currentStats.taskCount,
      tokenSource: desktopUsageTotals && tokenSource === "desktop" ? "desktop" : "database",
      tokenTotal: currentStats.tokenTotal,
    },
    trend: buildTrend(recordRows, selectedDate, desktopUsageTotals),
  };
}
