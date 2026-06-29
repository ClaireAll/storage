import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SharedThemeTexture } from "./(pages)/theme/shared-theme-texture";
import "./(pages)/theme/theme.less";
import "./globals.css";

export const metadata: Metadata = {
  title: "storage",
  description: "个人文章推荐储存/库存管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <SharedThemeTexture />
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
