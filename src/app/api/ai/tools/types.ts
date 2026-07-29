import type { ItemCategory } from "@/app/utils/database";

export type AssistantSection = {
  title: string;
  content: string;
};

export type AssistantItem = {
  category: string;
  categoryLabel: string;
  id: string;
  imageUrl?: string;
  name: string;
  price?: number;
  subtitle?: string;
  url?: string;
};

export type AssistantStructuredResponse = {
  images?: string[];
  items?: AssistantItem[];
  reply: string;
  sections?: AssistantSection[];
  suggestions?: string[];
};

export type ToolExecutionContext = {
  argumentsText?: string;
  name?: string;
  userId: string;
};

export type ToolExecutionResult = {
  content: string;
  images?: string[];
};

export type InventoryToolArguments = {
  categories?: ItemCategory[];
  category?: ItemCategory;
  color?: string;
  has_file?: boolean;
  has_image?: boolean;
  has_url?: boolean;
  image_urls?: unknown;
  keyword?: string;
  max_count?: number;
  max_price?: number;
  min_count?: number;
  min_price?: number;
  missing_fields?: string[];
  prompt?: string;
  season?: string;
};

export type DeepSeekToolDefinition = {
  function: {
    description: string;
    name: string;
    parameters: Record<string, unknown>;
  };
  type: "function";
};
