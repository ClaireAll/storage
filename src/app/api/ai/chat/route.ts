import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import {
  aiToolDefinitions,
  executeAiTool,
} from "../tools/registry";
import type { AssistantStructuredResponse } from "../tools/types";

type ChatMessage = {
  content?: string;
  role?: string;
};

type ToolCall = {
  function?: {
    arguments?: string;
    name?: string;
  };
  id: string;
  type?: "function";
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: ToolCall[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type NormalizedMessage = {
  content: string;
  role: "assistant" | "user";
};

type DeepSeekMessage =
  | NormalizedMessage
  | { content: string; role: "system" }
  | {
      content: string | null;
      role: "assistant";
      tool_calls: ToolCall[];
    }
  | {
      content: string;
      role: "tool";
      tool_call_id: string;
    };

const deepSeekEndpoint = "https://api.deepseek.com/chat/completions";
const maxToolRounds = 4;
const maxMessages = 20;
const maxMessageLength = 4000;

function normalizeMessages(messages: unknown): NormalizedMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-maxMessages)
    .map((message: ChatMessage): NormalizedMessage => ({
      content:
        typeof message.content === "string"
          ? message.content.trim().slice(0, maxMessageLength)
          : "",
      role: message.role === "assistant" ? "assistant" : "user",
    }))
    .filter((message) => message.content);
}

async function requestDeepSeek({
  apiKey,
  messages,
}: {
  apiKey: string;
  messages: DeepSeekMessage[];
}) {
  const response = await fetch(deepSeekEndpoint, {
    body: JSON.stringify({
      messages,
      model: "deepseek-v4-flash",
      stream: false,
      tools: aiToolDefinitions,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = (await response.json().catch(() => ({}))) as DeepSeekResponse;

  return { response, result };
}

function extractGeneratedImages(toolContent: string) {
  try {
    const parsed = JSON.parse(toolContent || "{}") as { images?: unknown };

    if (!Array.isArray(parsed.images)) {
      return [];
    }

    return parsed.images.filter(
      (image): image is string =>
        typeof image === "string" && /^https?:\/\//i.test(image),
    );
  } catch {
    return [];
  }
}

function normalizeAssistantResponse({
  generatedImages,
  reply,
}: {
  generatedImages: string[];
  reply?: string | null;
}): AssistantStructuredResponse {
  const trimmedReply = reply?.trim() ?? "";

  if (trimmedReply.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmedReply) as Partial<AssistantStructuredResponse>;

      return {
        images: mergeImages(generatedImages, parsed.images),
        items: Array.isArray(parsed.items) ? parsed.items : undefined,
        reply: parsed.reply?.trim() || "我暂时没有生成可用回复。",
        sections: Array.isArray(parsed.sections) ? parsed.sections : undefined,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((item) => typeof item === "string")
          : undefined,
      };
    } catch {
      // Fall back to plain text below.
    }
  }

  return {
    images: generatedImages,
    reply: trimmedReply || "我暂时没有生成可用回复。",
    suggestions: ["查找缺少图片的物品", "汇总我的库存", "推荐一套日常搭配"],
  };
}

function mergeImages(baseImages: string[], responseImages?: unknown) {
  const parsedImages = Array.isArray(responseImages)
    ? responseImages.filter(
        (image): image is string =>
          typeof image === "string" && /^https?:\/\//i.test(image),
      )
    : [];

  return Array.from(new Set([...baseImages, ...parsedImages]));
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "缺少 DEEPSEEK_API_KEY" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
  } | null;
  const messages = normalizeMessages(body?.messages);

  if (!messages.length) {
    return NextResponse.json({ message: "请输入问题" }, { status: 400 });
  }

  const deepSeekMessages: DeepSeekMessage[] = [
    {
      content:
        "你是一个简洁、可靠的个人库存管理助手。请用中文回答。需要库存数据时先调用工具，不要编造列表。阶段 1 只能读取、总结和推荐，不能创建、更新或删除记录。回答可以是纯文本，也可以返回 JSON，结构为 reply、sections、items、suggestions、images。用户明确要求生成图片时才调用 generate_outfit_image；普通搭配推荐优先调用 recommend_outfit。",
      role: "system",
    },
    ...messages,
  ];
  const generatedImages: string[] = [];

  for (let round = 0; round < maxToolRounds; round += 1) {
    const { response, result } = await requestDeepSeek({
      apiKey,
      messages: deepSeekMessages,
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: result.error?.message ?? "DeepSeek 请求失败" },
        { status: response.status },
      );
    }

    const assistantMessage = result.choices?.[0]?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];

    if (!toolCalls.length) {
      return NextResponse.json(
        normalizeAssistantResponse({
          generatedImages,
          reply: assistantMessage?.content,
        }),
      );
    }

    deepSeekMessages.push({
      content: assistantMessage?.content ?? null,
      role: "assistant",
      tool_calls: toolCalls,
    });

    const toolMessages = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await executeAiTool({
          argumentsText: toolCall.function?.arguments,
          name: toolCall.function?.name,
          userId: session.user.id,
        });

        generatedImages.push(
          ...(result.images ?? extractGeneratedImages(result.content)),
        );

        return {
          content: result.content,
          role: "tool" as const,
          tool_call_id: toolCall.id,
        };
      }),
    );

    deepSeekMessages.push(...toolMessages);
  }

  return NextResponse.json({
    images: generatedImages,
    reply: generatedImages.length
      ? "搭配效果图已生成。"
      : "工具调用次数较多，暂时没有生成可用回复。",
    suggestions: ["换一种问法", "只查一个分类", "汇总我的库存"],
  } satisfies AssistantStructuredResponse);
}
