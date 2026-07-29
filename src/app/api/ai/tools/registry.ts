import { createClient } from "@/utils/supabase/server";
import { generateWanxiangOutfitImage } from "../wanxiang";
import {
  findIncompleteItems,
  getInventoryList,
  inventoryCategories,
  inventoryCategoryLabels,
  parseToolArguments,
  recommendOutfit,
  searchInventoryItems,
  summarizeInventory,
} from "./inventory-tools";
import type {
  DeepSeekToolDefinition,
  InventoryToolArguments,
  ToolExecutionContext,
  ToolExecutionResult,
} from "./types";

const categoryEnum = inventoryCategories;

export const aiToolDefinitions: DeepSeekToolDefinition[] = [
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
              "库存分类，可选 clothes, pants, toiletries, books, hobby, cosmetic, skincare, blog。",
            enum: categoryEnum,
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
        "按条件搜索一个或多个库存分类。适合查找夏天衣服、黑色衣服、低库存护肤品、有链接的笔记等。",
      name: "search_inventory_items",
      parameters: {
        additionalProperties: false,
        properties: {
          categories: {
            items: { enum: categoryEnum, type: "string" },
            type: "array",
          },
          category: { enum: categoryEnum, type: "string" },
          color: { type: "string" },
          has_file: { type: "boolean" },
          has_image: { type: "boolean" },
          has_url: { type: "boolean" },
          keyword: { type: "string" },
          max_count: { type: "number" },
          max_price: { type: "number" },
          min_count: { type: "number" },
          min_price: { type: "number" },
          season: { type: "string" },
        },
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "查找缺少图片、价格、分类、文件、链接或数量的库存记录。适合回答哪些记录需要补全。",
      name: "find_incomplete_items",
      parameters: {
        additionalProperties: false,
        properties: {
          categories: {
            items: { enum: categoryEnum, type: "string" },
            type: "array",
          },
          category: { enum: categoryEnum, type: "string" },
          missing_fields: {
            items: {
              enum: ["image", "price", "category", "file", "url", "count"],
              type: "string",
            },
            type: "array",
          },
        },
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "汇总库存概况，包括各分类数量、缺图数量、低库存数量和价格合计。",
      name: "summarize_inventory",
      parameters: {
        additionalProperties: false,
        properties: {
          categories: {
            items: { enum: categoryEnum, type: "string" },
            type: "array",
          },
          category: { enum: categoryEnum, type: "string" },
        },
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "只读取衣服和裤子库存并推荐搭配，不生成图片。用户明确要效果图时再使用 generate_outfit_image。",
      name: "recommend_outfit",
      parameters: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "调用阿里万相 wan2.7-image-pro 生成搭配效果图。只有用户明确要求生成图片、搭配图、效果图时使用。",
      name: "generate_outfit_image",
      parameters: {
        additionalProperties: false,
        properties: {
          image_urls: {
            description: "参考图片 URL 数组，优先使用库存中的 pic_url。",
            items: { type: "string" },
            type: "array",
          },
          prompt: {
            description: "中文出图提示词。",
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

export async function executeAiTool({
  argumentsText,
  name,
  userId,
}: ToolExecutionContext): Promise<ToolExecutionResult> {
  const args = parseToolArguments(argumentsText) as InventoryToolArguments;

  try {
    if (name === "generate_outfit_image") {
      return executeWanxiangTool(args);
    }

    const supabase = await createClient();
    let result: unknown;

    if (name === "get_inventory_list") {
      result = await getInventoryList({
        category: args.category,
        supabase,
        userId,
      });
    } else if (name === "search_inventory_items") {
      result = await searchInventoryItems({ args, supabase, userId });
    } else if (name === "find_incomplete_items") {
      result = await findIncompleteItems({ args, supabase, userId });
    } else if (name === "summarize_inventory") {
      result = await summarizeInventory({ args, supabase, userId });
    } else if (name === "recommend_outfit") {
      result = await recommendOutfit({ supabase, userId });
    } else {
      result = { error: "未知工具", recoverable: true };
    }

    return { content: JSON.stringify(result) };
  } catch (error) {
    return {
      content: JSON.stringify({
        error: error instanceof Error ? error.message : "工具调用失败",
        recoverable: false,
      }),
    };
  }
}

export function normalizeToolImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => /^https?:\/\//i.test(url));
}

async function executeWanxiangTool(
  args: InventoryToolArguments,
): Promise<ToolExecutionResult> {
  const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";

  if (!prompt) {
    return {
      content: JSON.stringify({
        error: "缺少搭配效果图提示词",
        recoverable: true,
      }),
    };
  }

  const result = await generateWanxiangOutfitImage({
    imageUrls: normalizeToolImageUrls(args.image_urls),
    prompt,
  });

  return {
    content: JSON.stringify({
      images: result.imageUrls,
      model: result.model,
    }),
    images: result.imageUrls,
  };
}

export { inventoryCategoryLabels, parseToolArguments };
