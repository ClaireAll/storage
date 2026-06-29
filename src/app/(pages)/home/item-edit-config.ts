export type ItemCategoryConfig = {
  apiPath: string;
  hasColor?: boolean;
  hasDate?: boolean;
  hasSeason?: boolean;
  hasCount?: boolean;
  hasBookCategory?: boolean;
  itemLabel: string;
  namePlaceholder?: string;
  uploadDirectory: "clothes" | "pants" | "toiletries" | "books";
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
    hasColor: false,
    hasDate: false,
    hasSeason: false,
    itemLabel: "图书",
    namePlaceholder: "三体",
    uploadDirectory: "books",
  },
};

export function getItemCategoryConfig(categoryHref?: string) {
  return categoryHref ? itemCategoryConfigs[categoryHref] : undefined;
}
