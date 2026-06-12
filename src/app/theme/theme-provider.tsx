"use client";

import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import { useState, type ReactNode } from "react";
import type { ThemeConfig } from "./types";

type ThemeContext = {
  themeConfig: ThemeConfig;
  updateTheme: (nextConfig: ThemeConfig) => Promise<void>;
};

type ThemeProviderProps = {
  children: (context: ThemeContext) => ReactNode;
  initialTheme: ThemeConfig;
};

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeConfig, setThemeConfig] = useState(initialTheme);
  const isDark = themeConfig.mode === "dark";

  async function updateTheme(nextConfig: ThemeConfig) {
    setThemeConfig(nextConfig);

    await fetch("/api/theme", {
      body: JSON.stringify(nextConfig),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: themeConfig.color,
        },
      }}
    >
      <AntApp>
        {children({
          themeConfig,
          updateTheme,
        })}
      </AntApp>
    </ConfigProvider>
  );
}
