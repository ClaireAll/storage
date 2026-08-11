import type { ElementType } from "react";

export type HomeCategory = {
  key: string;
  label: string;
  href: string;
  Icon?: ElementType;
  iconClassName?: string;
  children?: HomeCategory[];
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

export const blogCategoryOptions: ItemCategoryOption[] = [
  { label: "笔记", value: 1 },
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
export const blogCategoryLabels = getCategoryLabels(blogCategoryOptions);

export const homeCategories: HomeCategory[] = [
  {
    href: "/home/clothes",
    iconClassName: "icon-clothes",
    key: "clothes",
    label: "衣服",
  },
  {
    href: "/home/pants",
    iconClassName: "icon-pants",
    key: "pants",
    label: "裤子",
  },
  {
    href: "/home/toiletries",
    iconClassName: "icon-toiletries",
    key: "toiletries",
    label: "日用品",
  },
  {
    href: "/home/books",
    iconClassName: "icon-book",
    key: "books",
    label: "图书",
  },
  {
    href: "/home/hobby",
    iconClassName: "icon-hobby",
    key: "hobby",
    label: "爱好",
  },
  {
    href: "/home/cosmetic",
    iconClassName: "icon-cosmetic",
    key: "cosmetic",
    label: "化妆品",
  },
  {
    href: "/home/skincare",
    iconClassName: "icon-skincare",
    key: "skincare",
    label: "护肤品",
  },
  {
    href: "/home/blog",
    iconClassName: "icon-blog",
    key: "blog",
    label: "笔记",
  },
  {
    href: "codex",
    iconClassName: "icon-codex",
    key: "codex",
    label: "Codex",
    children: [
      {
        href: "/home/codex-log",
        iconClassName: "icon-daily-report",
        key: "daily-report",
        label: "日报",
      },
      {
        href: "/home/codex-plugin",
        iconClassName: "icon-plugin",
        key: "plugin",
        label: "Plugin",
      },
      {
        href: "/home/codex-skills",
        iconClassName: "icon-skills",
        key: "skills",
        label: "Skills",
      },
    ],
  },
];

export const homeLeafCategories = homeCategories.flatMap(
  (category) => category.children ?? [category],
);

export const homeStats: HomeStat[] = [
  { label: "文章推荐", value: 0 },
  { label: "位置", value: 0 },
  { label: "快捷功能", value: homeLeafCategories.length },
];
