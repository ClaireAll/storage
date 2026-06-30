import {
  EnvironmentOutlined,
  InboxOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import type { ComponentType, ElementType } from "react";

export type HomeCategory = {
  label: string;
  href: string;
  Icon?: ElementType;
  iconClassName?: string;
};

export type HomeStat = {
  label: string;
  value: number;
  Icon: ComponentType;
};

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
];

export const homeStats: HomeStat[] = [
  { Icon: InboxOutlined, label: "文章推荐", value: 0 },
  { Icon: EnvironmentOutlined, label: "位置", value: 0 },
  { Icon: TagsOutlined, label: "快捷功能", value: homeCategories.length },
];
