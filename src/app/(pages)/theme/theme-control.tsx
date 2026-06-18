"use client";

import { BgColorsOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useRouter } from "next/navigation";

export function ThemeControl() {
  const router = useRouter();

  return (
    <Button
      aria-label="打开主题设置"
      icon={<BgColorsOutlined />}
      onClick={() => router.push("/theme")}
    />
  );
}
