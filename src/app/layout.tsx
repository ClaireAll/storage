import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { IconfontScriptLoader } from "./(pages)/common/iconfont-script-loader";
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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/iconfont/iconfont.css" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <IconfontScriptLoader />
        <SharedThemeTexture />
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
