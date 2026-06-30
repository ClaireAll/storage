export type ItemCategoryConfig = {
  apiPath: string;
  hasColor?: boolean;
  hasBookFile?: boolean;
  hasDate?: boolean;
  hasImage?: boolean;
  hasSeason?: boolean;
  hasPrice?: boolean;
  hasCount?: boolean;
  hasBookCategory?: boolean;
  itemCategoryOptions?: { label: string; value: number }[];
  itemLabel: string;
  namePlaceholder?: string;
  uploadDirectory: "clothes" | "pants" | "toiletries" | "books" | "hobby";
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
  "/home/hobby": {
    apiPath: "/api/hobby",
    hasColor: false,
    hasSeason: false,
    itemCategoryOptions: [
      { label: "金属拼图", value: 1 },
      { label: "数字油画", value: 2 },
      { label: "钻石画", value: 3 },
    ],
    itemLabel: "爱好",
    namePlaceholder: "金属拼图",
    uploadDirectory: "hobby",
  },
};

export function getItemCategoryConfig(categoryHref?: string) {
  return categoryHref ? itemCategoryConfigs[categoryHref] : undefined;
}
