"use client";

import { useEffect } from "react";

/** 同步页面外层背景色，参数 color 为当前路由使用的主题背景色。 */
export function ThemeShellBackground({
  color,
  scrollbarColor,
}: {
  /** 当前路由使用的主题背景色。 */
  color: string;
  /** 当前主题强调色，用于浏览器原生滚动条。 */
  scrollbarColor?: string;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = root.style.backgroundColor;
    const previousScrollbarColor = root.style.getPropertyValue(
      "--storage-scrollbar-color",
    );

    document.body.style.backgroundColor = color;
    root.style.backgroundColor = color;
    root.style.setProperty("--storage-scrollbar-color", scrollbarColor ?? color);

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      root.style.backgroundColor = previousHtmlBackground;

      if (previousScrollbarColor) {
        root.style.setProperty(
          "--storage-scrollbar-color",
          previousScrollbarColor,
        );
      } else {
        root.style.removeProperty("--storage-scrollbar-color");
      }
    };
  }, [color, scrollbarColor]);

  return null;
}
