"use client";

import { Spin } from "antd";

/** 主题设置页加载态，用于动态读取主题数据时先展示加载反馈。 */
export default function ThemeLoading() {
  return <Spin description="正在加载主题设置" fullscreen size="large" />;
}
