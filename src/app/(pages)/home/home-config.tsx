import {
  EnvironmentOutlined,
  InboxOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import type React from "react";

/** 首页分类配置。 */
export type HomeCategory = {
  /** 分类名称。 */
  label: string;
  /** 分类页面路径。 */
  href: string;
  /** iconfont 图标类名。 */
  iconClassName: string;
};

/** 首页统计卡片配置。 */
export type HomeStat = {
  /** 统计名称。 */
  label: string;
  /** 统计数值。 */
  value: number;
  /** 统计图标。 */
  icon: React.ReactNode;
};

export const homeCategories: HomeCategory[] = [
  {
    label: "衣服",
    href: "/home/clothes",
    iconClassName: "icon-clothes",
  },
  {
    label: "裤子",
    href: "/home/pants",
    iconClassName: "icon-pants",
  },
];

export const homeStats: HomeStat[] = [
  { label: "物品", value: 0, icon: <InboxOutlined /> },
  { label: "分类", value: homeCategories.length, icon: <TagsOutlined /> },
  { label: "位置", value: 0, icon: <EnvironmentOutlined /> },
];
