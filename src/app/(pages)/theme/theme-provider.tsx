"use client";

import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  ResolvedThemeMode,
  ThemeConfig,
  ThemePalette,
} from "./types";

type ThemeContext = {
  activePalette: ThemePalette;
  resolvedMode: ResolvedThemeMode;
  themeConfig: ThemeConfig;
  updateTheme: (nextConfig: ThemeConfig) => Promise<void>;
};

type ThemeProviderProps = {
  children: (context: ThemeContext) => ReactNode;
  initialTheme: ThemeConfig;
};

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeConfig, setThemeConfig] = useState(initialTheme);
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>("light");
  const resolvedMode =
    themeConfig.mode === "system" ? systemMode : themeConfig.mode;
  const activePalette = useMemo(
    () => themeConfig[resolvedMode],
    [resolvedMode, themeConfig],
  );
  const isDark = resolvedMode === "dark";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemMode = () => {
      setSystemMode(mediaQuery.matches ? "dark" : "light");
    };

    syncSystemMode();
    mediaQuery.addEventListener("change", syncSystemMode);

    return () => {
      mediaQuery.removeEventListener("change", syncSystemMode);
    };
  }, []);

  async function updateTheme(nextConfig: ThemeConfig) {
    const response = await fetch("/api/theme", {
      body: JSON.stringify(nextConfig),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      throw new Error(result?.message ?? "主题保存失败");
    }

    setThemeConfig(nextConfig);
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorBgBase: activePalette.bg,
          colorLink: activePalette.color,
          colorLinkActive: activePalette.color,
          colorLinkHover: activePalette.color,
          colorPrimary: activePalette.color,
          colorTextBase: activePalette.text,
        },
      }}
    >
      <AntApp>
        {children({
          activePalette,
          resolvedMode,
          themeConfig,
          updateTheme,
        })}
      </AntApp>
    </ConfigProvider>
  );
}
