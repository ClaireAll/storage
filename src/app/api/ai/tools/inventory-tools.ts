import type { ClothesItem } from "@/app/(pages)/home/clothes/clothes-type";
import {
  listItems,
  type DatabaseClient,
  type ItemCategory,
} from "@/app/utils/database";
import type { AssistantItem, InventoryToolArguments } from "./types";

export const inventoryCategoryLabels: Record<ItemCategory, string> = {
  blog: "笔记",
  books: "图书",
  clothes: "衣服",
  cosmetic: "化妆品",
  hobby: "爱好",
  pants: "裤子",
  skincare: "护肤品",
  toiletries: "日用品",
};

export const inventoryCategories = Object.keys(
  inventoryCategoryLabels,
) as ItemCategory[];

type InventoryItemWithCategory = ClothesItem & {
  inventoryCategory: ItemCategory;
};

type InventoryToolContext = {
  supabase: DatabaseClient;
  userId: string;
};

export function isItemCategory(value: unknown): value is ItemCategory {
  return (
    typeof value === "string" &&
    inventoryCategories.includes(value as ItemCategory)
  );
}

export function parseToolArguments(argumentsText?: string) {
  try {
    return JSON.parse(argumentsText || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getToolCategories(args: InventoryToolArguments) {
  const categories = Array.isArray(args.categories)
    ? args.categories.filter(isItemCategory)
    : [];

  if (categories.length) {
    return Array.from(new Set(categories));
  }

  return isItemCategory(args.category) ? [args.category] : inventoryCategories;
}

export async function getInventoryList({
  category,
  supabase,
  userId,
}: InventoryToolContext & { category?: ItemCategory }) {
  if (!category || !isItemCategory(category)) {
    return { error: "不支持的分类", recoverable: true };
  }

  const { data, error } = await listItems(supabase, category, userId);

  if (error) {
    return { error: error.message, recoverable: false };
  }

  return {
    category,
    categoryLabel: inventoryCategoryLabels[category],
    items: data.slice(0, 50).map((item) => mapAssistantItem(category, item)),
    total: data.length,
  };
}

export async function searchInventoryItems({
  args,
  supabase,
  userId,
}: InventoryToolContext & { args: InventoryToolArguments }) {
  const items = await loadInventoryItems({
    categories: getToolCategories(args),
    supabase,
    userId,
  });
  const filteredItems = items.filter((item) => matchesFilters(item, args));

  return {
    items: filteredItems
      .slice(0, 50)
      .map((item) => mapAssistantItem(item.inventoryCategory, item)),
    sections: [
      {
        content: `共找到 ${filteredItems.length} 条匹配记录。`,
        title: "搜索结果",
      },
    ],
    total: filteredItems.length,
  };
}

export async function findIncompleteItems({
  args,
  supabase,
  userId,
}: InventoryToolContext & { args: InventoryToolArguments }) {
  const missingFields = Array.isArray(args.missing_fields)
    ? args.missing_fields
    : [];
  const items = await loadInventoryItems({
    categories: getToolCategories(args),
    supabase,
    userId,
  });
  const incompleteItems = items
    .map((item) => ({
      item,
      missing: getMissingFields(item, missingFields),
    }))
    .filter(({ missing }) => missing.length);

  return {
    items: incompleteItems.slice(0, 50).map(({ item, missing }) => ({
      ...mapAssistantItem(item.inventoryCategory, item),
      subtitle: `缺少：${missing.join("、")}`,
    })),
    sections: [
      {
        content: `共找到 ${incompleteItems.length} 条需要补全的记录。`,
        title: "待完善记录",
      },
    ],
    total: incompleteItems.length,
  };
}

export async function summarizeInventory({
  args,
  supabase,
  userId,
}: InventoryToolContext & { args: InventoryToolArguments }) {
  const items = await loadInventoryItems({
    categories: getToolCategories(args),
    supabase,
    userId,
  });
  const groupedCounts = inventoryCategories
    .map((category) => ({
      category,
      count: items.filter((item) => item.inventoryCategory === category).length,
    }))
    .filter(({ count }) => count > 0);
  const missingImageCount = items.filter((item) => !item.pic_url).length;
  const lowCountItems = items.filter(
    (item) => typeof item.count === "number" && item.count < 2,
  );
  const priceTotal = items.reduce(
    (total, item) => total + (typeof item.price === "number" ? item.price : 0),
    0,
  );

  return {
    sections: [
      {
        content: groupedCounts
          .map(({ category, count }) => `${inventoryCategoryLabels[category]}：${count}`)
          .join("；"),
        title: "分类数量",
      },
      {
        content: `缺少图片 ${missingImageCount} 条；低库存 ${lowCountItems.length} 条；已记录价格合计约 ${priceTotal.toFixed(2)}。`,
        title: "库存健康",
      },
    ],
    total: items.length,
  };
}

export async function recommendOutfit({
  supabase,
  userId,
}: InventoryToolContext) {
  const [clothesResult, pantsResult] = await Promise.all([
    listItems(supabase, "clothes", userId),
    listItems(supabase, "pants", userId),
  ]);

  if (clothesResult.error) {
    return { error: clothesResult.error.message, recoverable: false };
  }

  if (pantsResult.error) {
    return { error: pantsResult.error.message, recoverable: false };
  }

  const clothes = clothesResult.data ?? [];
  const pants = pantsResult.data ?? [];
  const pairs = clothes.slice(0, 3).flatMap((top) =>
    pants.slice(0, 3).map((bottom) => ({
      bottom,
      reason: getOutfitReason(top, bottom),
      top,
    })),
  );

  return {
    items: pairs.slice(0, 6).flatMap(({ bottom, top }) => [
      mapAssistantItem("clothes", top),
      mapAssistantItem("pants", bottom),
    ]),
    sections: pairs.slice(0, 3).map(({ bottom, reason, top }, index) => ({
      content: `${top.name} + ${bottom.name}。${reason}`,
      title: `搭配 ${index + 1}`,
    })),
    suggestions: ["要不要基于这套搭配生成效果图？", "只推荐适合夏天的搭配"],
    total: pairs.length,
  };
}

async function loadInventoryItems({
  categories,
  supabase,
  userId,
}: InventoryToolContext & { categories: ItemCategory[] }) {
  const results = await Promise.all(
    categories.map(async (category) => {
      const { data, error } = await listItems(supabase, category, userId);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((item) => ({
        ...item,
        inventoryCategory: category,
      }));
    }),
  );

  return results.flat();
}

function matchesFilters(
  item: InventoryItemWithCategory,
  args: InventoryToolArguments,
) {
  const keyword = args.keyword?.trim().toLowerCase();

  if (keyword && !item.name.toLowerCase().includes(keyword)) {
    return false;
  }

  if (args.season && !String(item.season ?? "").includes(args.season)) {
    return false;
  }

  if (args.color && item.color !== args.color) {
    return false;
  }

  if (
    typeof args.min_price === "number" &&
    (typeof item.price !== "number" || item.price < args.min_price)
  ) {
    return false;
  }

  if (
    typeof args.max_price === "number" &&
    (typeof item.price !== "number" || item.price > args.max_price)
  ) {
    return false;
  }

  if (
    typeof args.min_count === "number" &&
    (typeof item.count !== "number" || item.count < args.min_count)
  ) {
    return false;
  }

  if (
    typeof args.max_count === "number" &&
    (typeof item.count !== "number" || item.count > args.max_count)
  ) {
    return false;
  }

  if (
    typeof args.has_image === "boolean" &&
    Boolean(item.pic_url) !== args.has_image
  ) {
    return false;
  }

  if (
    typeof args.has_file === "boolean" &&
    Boolean(item.download_url) !== args.has_file
  ) {
    return false;
  }

  if (typeof args.has_url === "boolean" && Boolean(item.url) !== args.has_url) {
    return false;
  }

  return true;
}

function getMissingFields(
  item: InventoryItemWithCategory,
  requestedFields: string[],
) {
  const fields = requestedFields.length
    ? requestedFields
    : ["image", "price", "category", "file", "url", "count"];
  const missing: string[] = [];

  if (fields.includes("image") && !item.pic_url) {
    missing.push("图片");
  }

  if (fields.includes("price") && typeof item.price !== "number") {
    missing.push("价格");
  }

  if (fields.includes("category") && typeof item.category !== "number") {
    missing.push("分类");
  }

  if (fields.includes("file") && !item.download_url) {
    missing.push("文件");
  }

  if (fields.includes("url") && !item.url) {
    missing.push("链接");
  }

  if (fields.includes("count") && typeof item.count !== "number") {
    missing.push("数量");
  }

  return missing;
}

function getOutfitReason(top: ClothesItem, bottom: ClothesItem) {
  const season = [top.season, bottom.season].filter(Boolean).join("、");

  return season ? `季节标签接近：${season}。` : "可作为一套基础日常搭配。";
}

function mapAssistantItem(
  category: ItemCategory,
  item: ClothesItem,
): AssistantItem {
  return {
    category,
    categoryLabel: inventoryCategoryLabels[category],
    id: String(item.c_id),
    imageUrl: item.pic_url,
    name: item.name,
    price: item.price,
    subtitle: getItemSubtitle(item),
    url: item.url,
  };
}

function getItemSubtitle(item: ClothesItem) {
  const parts = [
    item.season ? `季节：${item.season}` : "",
    typeof item.count === "number" ? `数量：${item.count}` : "",
    typeof item.category === "number" ? `分类：${item.category}` : "",
  ].filter(Boolean);

  return parts.join(" · ") || undefined;
}
