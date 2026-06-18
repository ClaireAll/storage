"use client";

import { useEffect } from "react";

/** 同步页面外层背景色，参数 color 为当前路由使用的主题背景色。 */
export function ThemeShellBackground({
  color,
}: {
  /** 当前路由使用的主题背景色。 */
  color: string;
}) {
  useEffect(() => {
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground =
      document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = color;
    document.documentElement.style.backgroundColor = color;

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
    };
  }, [color]);

  return null;
}
