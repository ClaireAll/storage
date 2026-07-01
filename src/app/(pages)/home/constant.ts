import type { ElementType } from "react";

export type HomeCategory = {
  label: string;
  href: string;
  Icon?: ElementType;
  iconClassName?: string;
};

export type HomeStat = {
  label: string;
  value: number;
};

export type ItemCategoryOption = { label: string; value: number };

export const bookCategoryOptions: ItemCategoryOption[] = [
  { label: "实体书", value: 1 },
  { label: "电子书", value: 2 },
];

export const hobbyCategoryOptions: ItemCategoryOption[] = [
  { label: "金属拼图", value: 1 },
  { label: "数字油画", value: 2 },
  { label: "钻石画", value: 3 },
];

export const cosmeticCategoryOptions: ItemCategoryOption[] = [
  { label: "口红", value: 1 },
  { label: "眼影", value: 2 },
];

export const skincareCategoryOptions: ItemCategoryOption[] = [
  { label: "面霜", value: 1 },
  { label: "眼霜", value: 2 },
];

export function getCategoryLabels(options: ItemCategoryOption[]) {
  return Object.fromEntries(
    options.map(({ label, value }) => [value, label]),
  ) as Record<number, string>;
}

export const bookCategoryLabels = getCategoryLabels(bookCategoryOptions);
export const hobbyCategoryLabels = getCategoryLabels(hobbyCategoryOptions);
export const cosmeticCategoryLabels = getCategoryLabels(
  cosmeticCategoryOptions,
);
export const skincareCategoryLabels = getCategoryLabels(
  skincareCategoryOptions,
);

export const homeCategories: HomeCategory[] = [
  {
    href: "/home/clothes",
    iconClassName: "icon-clothes",
    label: "衣服",
  },
  {
    href: "/home/pants",
    iconClassName: "icon-pants",
    label: "裤子",
  },
  {
    href: "/home/toiletries",
    iconClassName: "icon-toiletries",
    label: "日用品",
  },
  {
    href: "/home/books",
    iconClassName: "icon-book",
    label: "图书",
  },
  {
    href: "/home/hobby",
    iconClassName: "icon-hobby",
    label: "爱好",
  },
  {
    href: "/home/cosmetic",
    iconClassName: "icon-cosmetic",
    label: "化妆品",
  },
  {
    href: "/home/skincare",
    iconClassName: "icon-skincare",
    label: "护肤品",
  },
];

export const homeStats: HomeStat[] = [
  { label: "文章推荐", value: 0 },
  { label: "位置", value: 0 },
  { label: "快捷功能", value: homeCategories.length },
];
