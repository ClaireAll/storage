"use client";

import { BgColorsOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";

const themeReturnMarkerKey = "storage-theme-return-from-home";

/** 主题设置入口按钮。 */
export function ThemeControl() {
  /** 记录本次进入主题页来自首页，用于主题页返回时优先复用浏览器历史。 */
  function markHomeAsReturnTarget() {
    window.sessionStorage.setItem(themeReturnMarkerKey, "true");
  }

  return (
    <Link
      aria-label="打开主题设置"
      href="/theme"
      onClick={markHomeAsReturnTarget}
      prefetch
    >
      <Button icon={<BgColorsOutlined />} type="primary" />
    </Link>
  );
}

export { themeReturnMarkerKey };
