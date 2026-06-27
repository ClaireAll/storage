"use client";

import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isThemeConfig,
  themeConfigCacheKey,
  themeConfigChangeEventName,
} from "./constants";
import type {
  ResolvedThemeMode,
  ThemeConfig,
  ThemePalette,
} from "./types";

dayjs.locale("zh-cn");

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
  const pathname = usePathname();
  const [themeConfig, setThemeConfig] = useState(initialTheme);
  const [systemMode, setSystemMode] = useState<ResolvedThemeMode>("light");
  const hasMountedRef = useRef(false);
  const resolvedMode =
    themeConfig.mode === "system" ? systemMode : themeConfig.mode;
  const activePalette = useMemo(
    () => themeConfig[resolvedMode],
    [resolvedMode, themeConfig],
  );
  const isDark = resolvedMode === "dark";
  const syncCachedThemeConfig = useCallback(() => {
    const cachedConfig = getCachedThemeConfig();

    if (!cachedConfig) {
      return;
    }

    setThemeConfig((currentConfig) =>
      areThemeConfigsEqual(currentConfig, cachedConfig)
        ? currentConfig
        : cachedConfig,
    );
  }, []);

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

  useEffect(() => {
    const syncVisibleThemeConfig = () => {
      if (document.visibilityState === "visible") {
        syncCachedThemeConfig();
      }
    };

    const frameId = window.requestAnimationFrame(syncCachedThemeConfig);
    window.addEventListener(themeConfigChangeEventName, syncCachedThemeConfig);
    window.addEventListener("focus", syncCachedThemeConfig);
    window.addEventListener("pageshow", syncCachedThemeConfig);
    window.addEventListener("popstate", syncCachedThemeConfig);
    document.addEventListener("visibilitychange", syncVisibleThemeConfig);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(
        themeConfigChangeEventName,
        syncCachedThemeConfig,
      );
      window.removeEventListener("focus", syncCachedThemeConfig);
      window.removeEventListener("pageshow", syncCachedThemeConfig);
      window.removeEventListener("popstate", syncCachedThemeConfig);
      document.removeEventListener("visibilitychange", syncVisibleThemeConfig);
    };
  }, [syncCachedThemeConfig]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(syncCachedThemeConfig);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname, syncCachedThemeConfig]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    cacheThemeConfig(themeConfig);
  }, [themeConfig]);

  /** 保存并更新主题配置，参数 nextConfig 为用户提交的新主题。 */
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

    const savedConfig = (await response.json().catch(() => nextConfig)) as
      | ThemeConfig
      | unknown;
    const nextThemeConfig = isThemeConfig(savedConfig)
      ? savedConfig
      : nextConfig;

    cacheThemeConfig(nextThemeConfig);
    setThemeConfig(nextThemeConfig);
  }

  return (
    <ConfigProvider
      locale={zhCN}
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
          colorTextLightSolid: "rgb(255 255 255 / 92%)",
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

/** 判断两份主题配置是否一致，参数 currentConfig 与 nextConfig 为待比较的配置。 */
function areThemeConfigsEqual(
  currentConfig: ThemeConfig,
  nextConfig: ThemeConfig,
) {
  return JSON.stringify(currentConfig) === JSON.stringify(nextConfig);
}

/** 读取浏览器缓存中的主题配置。 */
function getCachedThemeConfig() {
  if (typeof window === "undefined") {
    return null;
  }

  const cachedValue = window.sessionStorage.getItem(themeConfigCacheKey);

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedConfig = JSON.parse(cachedValue) as unknown;

    return isThemeConfig(parsedConfig) ? parsedConfig : null;
  } catch {
    return null;
  }
}

/** 缓存主题配置，参数 config 为当前已经生效的主题配置。 */
function cacheThemeConfig(config: ThemeConfig) {
  const serializedConfig = encodeURIComponent(JSON.stringify(config));

  window.sessionStorage.setItem(themeConfigCacheKey, JSON.stringify(config));
  document.cookie = `${themeConfigCacheKey}=${serializedConfig}; Max-Age=${
    60 * 60 * 24 * 365
  }; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event(themeConfigChangeEventName));
}
