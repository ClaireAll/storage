import { listItems, type ItemCategory } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { generateWanxiangOutfitImage } from "../wanxiang";

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
const inventoryCategoryLabels: Record<ItemCategory, string> = {
  books: "图书",
  clothes: "衣服",
  cosmetic: "化妆品",
  hobby: "爱好",
  pants: "裤子",
  skincare: "护肤品",
  toiletries: "日用品",
};
const tools = [
  {
    function: {
      description:
        "获取当前登录用户某个库存分类的列表。用户询问已有物品、数量、价格、分类明细时使用。",
      name: "get_inventory_list",
      parameters: {
        additionalProperties: false,
        properties: {
          category: {
            description:
              "库存分类，可选 clothes, pants, toiletries, books, hobby, cosmetic, skincare。",
            enum: Object.keys(inventoryCategoryLabels),
            type: "string",
          },
        },
        required: ["category"],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "调用阿里万相 wan2.7-image-pro 生成搭配效果图。只有用户明确要求生成图片、搭配图、效果图时使用。使用前优先调用 get_inventory_list 获取带 pic_url 的衣服和裤子。",
      name: "generate_outfit_image",
      parameters: {
        additionalProperties: false,
        properties: {
          image_urls: {
            description:
              "参考图片 URL 数组，优先使用库存中的 pic_url，可包含衣服、裤子、人物或风格参考图。",
            items: { type: "string" },
            type: "array",
          },
          prompt: {
            description:
              "中文出图提示词，描述搭配场景、风格、背景、真实摄影效果和需要保留的服装特征。",
            type: "string",
          },
        },
        required: ["prompt"],
        type: "object",
      },
    },
    type: "function",
  },
];

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
      tools,
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

async function executeInventoryTool({
  argumentsText,
  userId,
}: {
  argumentsText?: string;
  userId: string;
}) {
  const parsedArguments = parseToolArguments(argumentsText) as {
    category?: ItemCategory;
  };
  const category = parsedArguments.category;

  if (!category || !(category in inventoryCategoryLabels)) {
    return JSON.stringify({ error: "不支持的分类" });
  }

  const supabase = await createClient();
  const { data, error } = await listItems(supabase, category, userId);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify({
    category,
    categoryLabel: inventoryCategoryLabels[category],
    items: data.slice(0, 50).map((item) => ({
      category: item.category,
      count: item.count,
      download_url: item.download_url,
      name: item.name,
      pic_url: item.pic_url,
      price: item.price,
      season: item.season,
      timeStamp: item.timeStamp,
    })),
    total: data.length,
  });
}

function parseToolArguments(argumentsText?: string) {
  try {
    return JSON.parse(argumentsText || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeToolImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => /^https?:\/\//i.test(url));
}

async function executeWanxiangTool({
  argumentsText,
  userId,
}: {
  argumentsText?: string;
  userId: string;
}) {
  const parsedArguments = parseToolArguments(argumentsText);
  const prompt =
    typeof parsedArguments.prompt === "string"
      ? parsedArguments.prompt.trim()
      : "";

  if (!prompt) {
    return JSON.stringify({ error: "缺少搭配效果图提示词" });
  }

  try {
    const result = await generateWanxiangOutfitImage({
      imageUrls: normalizeToolImageUrls(parsedArguments.image_urls),
      prompt,
      userId,
    });

    return JSON.stringify({
      images: result.imageUrls,
      model: result.model,
    });
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : "生成搭配效果图失败",
    });
  }
}

async function executeAiTool({
  argumentsText,
  name,
  userId,
}: {
  argumentsText?: string;
  name?: string;
  userId: string;
}) {
  if (name === "get_inventory_list") {
    return executeInventoryTool({ argumentsText, userId });
  }

  if (name === "generate_outfit_image") {
    return executeWanxiangTool({ argumentsText, userId });
  }

  return JSON.stringify({ error: "未知工具" });
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
        "你是一个简洁、可靠的个人库存管理助手。请用中文回答。需要知道用户库存列表时，先调用 get_inventory_list 工具，不要编造列表数据。用户要求生成搭配效果图时，先获取相关库存并优先使用带 pic_url 的衣服、裤子或人物参考图，再调用 generate_outfit_image。",
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
      const reply = assistantMessage?.content?.trim();

      return NextResponse.json({
        images: generatedImages,
        reply: reply || "我暂时没有生成可用回复。",
      });
    }

    deepSeekMessages.push({
      content: assistantMessage?.content ?? null,
      role: "assistant",
      tool_calls: toolCalls,
    });

    const toolMessages = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const content = await executeAiTool({
          argumentsText: toolCall.function?.arguments,
          name: toolCall.function?.name,
          userId: session.user.id,
        });

        generatedImages.push(...extractGeneratedImages(content));

        return {
          content,
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
  });
}
