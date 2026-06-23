import {
  EnvironmentOutlined,
  InboxOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import type { ComponentType } from "react";

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
  /** 统计图标组件。 */
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
];

export const homeStats: HomeStat[] = [
  { Icon: InboxOutlined, label: "物品", value: 0 },
  { Icon: TagsOutlined, label: "分类", value: homeCategories.length },
  { Icon: EnvironmentOutlined, label: "位置", value: 0 },
];
