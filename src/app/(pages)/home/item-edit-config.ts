import {
  blogCategoryOptions,
  cosmeticCategoryOptions,
  hobbyCategoryOptions,
  skincareCategoryOptions,
  type ItemCategoryOption,
} from "./constant";

export type ItemCategoryConfig = {
  apiPath: string;
  hasColor?: boolean;
  hasBookFile?: boolean;
  hasDate?: boolean;
  hasImage?: boolean;
  hasMultipleImages?: boolean;
  hasSeason?: boolean;
  hasPrice?: boolean;
  hasCount?: boolean;
  hasBookCategory?: boolean;
  hasUrl?: boolean;
  itemCategoryOptions?: ItemCategoryOption[];
  itemLabel: string;
  namePlaceholder?: string;
  uploadDirectory:
    | "clothes"
    | "pants"
    | "toiletries"
    | "books"
    | "hobby"
    | "cosmetic"
    | "skincare"
    | "blog";
};

export const itemCategoryConfigs: Record<string, ItemCategoryConfig> = {
  "/home/clothes": {
    apiPath: "/api/clothes",
    itemLabel: "衣服",
    uploadDirectory: "clothes",
  },
  "/home/pants": {
    apiPath: "/api/pants",
    itemLabel: "裤子",
    uploadDirectory: "pants",
  },
  "/home/toiletries": {
    apiPath: "/api/toiletries",
    hasColor: false,
    hasCount: true,
    hasSeason: false,
    itemLabel: "日用品",
    namePlaceholder: "牙膏",
    uploadDirectory: "toiletries",
  },
  "/home/books": {
    apiPath: "/api/books",
    hasBookCategory: true,
    hasBookFile: true,
    hasColor: false,
    hasDate: false,
    hasSeason: false,
    itemLabel: "图书",
    namePlaceholder: "三体",
    uploadDirectory: "books",
  },
  "/home/blog": {
    apiPath: "/api/blog",
    hasBookFile: false,
    hasColor: false,
    hasDate: false,
    hasImage: false,
    hasPrice: false,
    hasSeason: false,
    hasUrl: true,
    itemCategoryOptions: blogCategoryOptions,
    itemLabel: "笔记",
    namePlaceholder: "读书摘录",
    uploadDirectory: "blog",
  },
  "/home/hobby": {
    apiPath: "/api/hobby",
    hasColor: false,
    hasMultipleImages: true,
    hasSeason: false,
    itemCategoryOptions: hobbyCategoryOptions,
    itemLabel: "爱好",
    namePlaceholder: "金属拼图",
    uploadDirectory: "hobby",
  },
  "/home/cosmetic": {
    apiPath: "/api/cosmetic",
    hasColor: false,
    hasCount: true,
    hasSeason: false,
    itemCategoryOptions: cosmeticCategoryOptions,
    itemLabel: "化妆品",
    namePlaceholder: "口红",
    uploadDirectory: "cosmetic",
  },
  "/home/skincare": {
    apiPath: "/api/skincare",
    hasColor: false,
    hasCount: true,
    hasSeason: false,
    itemCategoryOptions: skincareCategoryOptions,
    itemLabel: "护肤品",
    namePlaceholder: "面霜",
    uploadDirectory: "skincare",
  },
};

export function getItemCategoryConfig(categoryHref?: string) {
  return categoryHref ? itemCategoryConfigs[categoryHref] : undefined;
}
