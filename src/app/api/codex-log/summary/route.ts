import { createHash } from "node:crypto";
import type { DatabaseClient } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

type CodexLogSummaryRow = {
  assistant_summary: string | null;
  category: number | null;
  thread_title: string | null;
  token_count: number | null;
  user_tasks: string | null;
};

type DeepSeekSummaryResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

type CodexDailySummary = {
  growth: string;
  shortage: string;
  summary: string;
};

type CodexDailyReportSummaryRow = {
  growth: string | null;
  shortage: string | null;
  summary: string | null;
  summary_generated_at: string | null;
};

const deepSeekEndpoint = "https://api.deepseek.com/chat/completions";
const categoryLabels: Record<number, string> = {
  1: "fx-data-web / fv-web2",
  2: "skills",
  3: "chrome-plugin",
  4: "Storage",
  5: "2026",
  6: "money-tool",
  7: "fd-biz",
  10000: "其它",
};

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toCleanText(value: string | null | undefined, fallback = "") {
  return (value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function parseDeepSeekSummary(content: string | null | undefined) {
  const rawContent = content?.trim() ?? "";
  const jsonText =
    rawContent.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim() ??
    rawContent.match(/\{[\s\S]*\}/)?.[0] ??
    rawContent;

  try {
    const parsed = JSON.parse(jsonText) as Partial<CodexDailySummary>;

    return {
      growth: toCleanText(parsed.growth, "今天的成长点还不够明确。"),
      shortage: toCleanText(parsed.shortage, "今天暂未识别到明显不足。"),
      summary: toCleanText(parsed.summary, rawContent || "今天暂无可总结内容。"),
    } satisfies CodexDailySummary;
  } catch {
    return {
      growth: "可以继续保持需求拆解、验证闭环和问题复盘的节奏。",
      shortage: "今天的结构化信息不足，建议后续记录更明确的验收结果。",
      summary: rawContent || "今天暂无可总结内容。",
    } satisfies CodexDailySummary;
  }
}

function buildDailySummaryPrompt(date: string, rows: CodexLogSummaryRow[]) {
  const lines = rows.slice(0, 80).map((row, index) => {
    const category = categoryLabels[row.category ?? 10000] ?? categoryLabels[10000];

    return [
      `${index + 1}. 仓库：${category}`,
      `标题：${toCleanText(row.thread_title, "未命名任务")}`,
      `任务：${toCleanText(row.user_tasks, "暂无任务描述")}`,
      `回答：${toCleanText(row.assistant_summary, "暂无回答简述")}`,
      `Token：${Math.round(row.token_count ?? 0)}`,
    ].join("\n");
  });

  return [
    `请基于 ${date} 的 Codex 会话日志，为用户本人生成每日工作复盘。`,
    "输出必须是 JSON，不要输出 Markdown，不要添加额外解释。",
    "JSON 字段固定为 summary、growth、shortage。",
    "复盘对象是用户本人，Codex 只是工具或协作对象。",
    "summary：从用户视角概括她今天完成了什么、推进了哪些方向。",
    "growth：分析用户今天体现出的进步、方法意识或能力提升。",
    "shortage：指出用户今天可以改进的不足，语气温和具体。",
    "不要评价 Codex，不要把总结、成长、不足写成 Codex 的能力评价。",
    "",
    lines.join("\n\n"),
  ].join("\n");
}

function getCachedDailySummary(
  report: CodexDailyReportSummaryRow | null,
): CodexDailySummary | null {
  if (!report?.summary_generated_at) {
    return null;
  }

  const summary = toCleanText(report.summary);
  const growth = toCleanText(report.growth);
  const shortage = toCleanText(report.shortage);

  return summary && growth && shortage ? { growth, shortage, summary } : null;
}

function createSummaryFingerprint(rows: CodexLogSummaryRow[]) {
  return createHash("sha256")
    .update(JSON.stringify(rows))
    .digest("hex");
}

async function cacheDailySummary(
  supabase: DatabaseClient,
  userId: string,
  date: string,
  summary: CodexDailySummary,
  sourceFingerprint: string,
) {
  await supabase.from("codex_daily_report").upsert(
    {
      date,
      growth: summary.growth,
      id: userId,
      shortage: summary.shortage,
      source_fingerprint: sourceFingerprint,
      summary: summary.summary,
      summary_generated_at: new Date().toISOString(),
      summary_model: "deepseek-v4-flash",
    },
    { onConflict: "id,date" },
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    date?: unknown;
  } | null;
  const date = isDate(payload?.date) ? payload.date : undefined;

  if (!date) {
    return NextResponse.json({ message: "缺少日期" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cachedReport } = await supabase
    .from("codex_daily_report")
    .select("summary,growth,shortage,summary_generated_at")
    .eq("id", session.user.id)
    .eq("date", date)
    .maybeSingle<CodexDailyReportSummaryRow>();
  const cachedSummary = getCachedDailySummary(cachedReport);

  if (cachedSummary) {
    return NextResponse.json(cachedSummary);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "缺少 DEEPSEEK_API_KEY" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("codex_log")
    .select("thread_title,user_tasks,assistant_summary,category,token_count")
    .eq("id", session.user.id)
    .eq("date", date)
    .order("created_at", { ascending: true })
    .returns<CodexLogSummaryRow[]>();

  if (error) {
    return NextResponse.json(
      { message: "读取日报记录失败" },
      { status: 500 },
    );
  }

  if (!data?.length) {
    const summary = {
      growth: "今天还没有可分析的会话记录。",
      shortage: "暂无数据时先不用复盘不足。",
      summary: "今天暂无 Codex 日报数据。",
    } satisfies CodexDailySummary;

    await cacheDailySummary(
      supabase,
      session.user.id,
      date,
      summary,
      createSummaryFingerprint([]),
    );
    return NextResponse.json(summary);
  }

  const response = await fetch(deepSeekEndpoint, {
    body: JSON.stringify({
      messages: [
        {
          content:
            "你是 Claire 的中文工作复盘助手。复盘对象是用户本人，Codex 只是工具或协作对象。请把零散任务整理成清晰、温和、可行动的每日总结。",
          role: "system",
        },
        {
          content: buildDailySummaryPrompt(date, data),
          role: "user",
        },
      ],
      model: "deepseek-v4-flash",
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = (await response
    .json()
    .catch(() => ({}))) as DeepSeekSummaryResponse;

  if (!response.ok) {
    return NextResponse.json(
      { message: result.error?.message ?? "DeepSeek 总结失败" },
      { status: response.status },
    );
  }

  const summary = parseDeepSeekSummary(result.choices?.[0]?.message?.content);

  await cacheDailySummary(
    supabase,
    session.user.id,
    date,
    summary,
    createSummaryFingerprint(data),
  );

  return NextResponse.json(summary);
}
