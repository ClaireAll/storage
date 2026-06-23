import type {
  ThemeConfig,
  ThemeDatabaseRow,
  ThemeMode,
  ThemeOption,
  ThemePalette,
  ThemeTexture,
} from "./types";
import { isSupportedThemeColor } from "./theme-utils";

export const themeModes: ThemeMode[] = ["system", "light", "dark"];

export const themeModeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "系统", value: "system" },
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
];

/** 主题背景纹理选项。 */
export const THEME_TEXTURES: Array<{ label: string; value: ThemeTexture }> = [
  { label: "无", value: "none" },
  { label: "散景动画", value: "bokeh" },
  { label: "几何动画", value: "geometry" },
  { label: "流星动画", value: "meteor" },
];

/** 浅色主题。 */
export const LIGHT_THEMES: ThemeOption[] = [
  { name: "经典商务", bg: "#F8F9FA", color: "#0D6EFD", text: "#212529" },
  { name: "现代科技", bg: "#F4F7F6", color: "#00C9A7", text: "#1A2B3C" },
  { name: "极简黑白", bg: "#FFFFFF", color: "#000000", text: "#333333" },
  { name: "温暖阳光", bg: "#FCF8F2", color: "#FF7E5F", text: "#4A403A" },
  { name: "宁静自然", bg: "#F0F4F1", color: "#2E7D32", text: "#1B382B" },
  { name: "浪漫微甜", bg: "#FDF6F8", color: "#E91E63", text: "#5D4037" },
  { name: "权威严谨", bg: "#F3F4F6", color: "#1E3A8A", text: "#111827" },
  { name: "阳光活力", bg: "#FFFBEB", color: "#F59E0B", text: "#78350F" },
  { name: "优雅知性", bg: "#F5EFF8", color: "#6B46C1", text: "#322043" },
  { name: "清新明亮", bg: "#EBF8FF", color: "#3182CE", text: "#2B6CB0" },
];

/** 深色主题。 */
export const DARK_THEMES: ThemeOption[] = [
  { name: "暗夜极客", bg: "#121212", color: "#00E676", text: "#E0E0E0" },
  { name: "暗夜护眼", bg: "#1E1E24", color: "#BB86FC", text: "#F5F5F7" },
  { name: "电竞狂潮", bg: "#0F0F12", color: "#FF2A54", text: "#FFFFFF" },
  { name: "奢华高定", bg: "#1A1A1A", color: "#D4AF37", text: "#E5E5E5" },
  { name: "全息投影", bg: "#0D1117", color: "#58A6FF", text: "#C9D1D9" },
  { name: "赛博霓虹", bg: "#090A0F", color: "#FF007F", text: "#F0F2F5" },
  { name: "质感毛玻璃", bg: "#1C1C1E", color: "#30D158", text: "#FFFFFF" },
  { name: "落日余晖", bg: "#16151B", color: "#FF6B6B", text: "#EAEAEA" },
  { name: "深海探秘", bg: "#0B131B", color: "#00ADB5", text: "#EEEEEE" },
  { name: "复古胶片", bg: "#1C1B1A", color: "#DEB887", text: "#DCD6CD" },
];

export const defaultThemeConfig: ThemeConfig = {
  light: LIGHT_THEMES[0],
  dark: DARK_THEMES[0],
  mode: "system",
  texture: THEME_TEXTURES[0].value,
};

export const themeConfigCacheKey = "storage-theme-config";
export const themeConfigChangeEventName = "storage-theme-config-change";

/** 查找与当前调色板完全匹配的主题，参数 options 为主题列表，value 为当前调色板。 */
export function findThemeOption(options: ThemeOption[], value: ThemePalette) {
  return options.find(
    (option) =>
      option.bg === value.bg &&
      option.color === value.color &&
      option.text === value.text,
  );
}

/** 判断传入字符串是否为合法主题模式。 */
export function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** 判断传入字符串是否为合法主题纹理。 */
export function isThemeTexture(value: string): value is ThemeTexture {
  return (
    value === "none" ||
    value === "bokeh" ||
    value === "geometry" ||
    value === "meteor"
  );
}

/** 兼容旧数据中的 squares / falling-lines 纹理值。 */
function normalizeThemeTexture(
  value?: string | null,
): ThemeTexture | undefined {
  if (value === "squares") {
    return "geometry";
  }

  if (value === "falling-lines") {
    return "meteor";
  }

  return value && isThemeTexture(value) ? value : undefined;
}

/** 判断传入字符串是否为 6 位十六进制颜色值。 */
export function isThemeColor(value: string): boolean {
  return isSupportedThemeColor(value);
}

/** 判断传入值是否为合法调色板。 */
export function isThemePalette(value: unknown): value is ThemePalette {
  if (!value || typeof value !== "object") {
    return false;
  }

  const palette = value as Partial<ThemePalette>;

  return (
    typeof palette.color === "string" &&
    typeof palette.bg === "string" &&
    typeof palette.text === "string" &&
    isThemeColor(palette.color) &&
    isThemeColor(palette.bg) &&
    isThemeColor(palette.text)
  );
}

/** 判断传入值是否为完整主题配置。 */
export function isThemeConfig(value: unknown): value is ThemeConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const config = value as Partial<ThemeConfig>;

  return (
    typeof config.mode === "string" &&
    isThemeMode(config.mode) &&
    typeof config.texture === "string" &&
    isThemeTexture(config.texture) &&
    isThemePalette(config.light) &&
    isThemePalette(config.dark)
  );
}

/** 解析 theme 字段中的扩展配置。 */
function parseThemeMeta(value?: string | null) {
  if (!value) {
    return {
      mode: defaultThemeConfig.mode,
      texture: defaultThemeConfig.texture,
    };
  }

  if (isThemeMode(value)) {
    return {
      mode: value,
      texture: defaultThemeConfig.texture,
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<{
      mode: string;
      texture: string;
    }>;

    return {
      mode:
        parsed.mode && isThemeMode(parsed.mode)
          ? parsed.mode
          : defaultThemeConfig.mode,
      texture:
        normalizeThemeTexture(parsed.texture) ?? defaultThemeConfig.texture,
    };
  } catch {
    return {
      mode: defaultThemeConfig.mode,
      texture: defaultThemeConfig.texture,
    };
  }
}

/** 将 theme 表数据转换为前端主题配置。 */
export function getThemeConfigFromRow(
  row?: Partial<ThemeDatabaseRow> | null,
  mode?: ThemeMode,
): ThemeConfig {
  const themeMeta = parseThemeMeta(row?.theme);
  const rowTexture = normalizeThemeTexture(row?.texture);

  return {
    mode: mode ?? themeMeta.mode,
    texture: rowTexture ?? themeMeta.texture,
    light: {
      bg: row?.light_theme_bg ?? defaultThemeConfig.light.bg,
      color: row?.light_theme_color ?? defaultThemeConfig.light.color,
      text: row?.light_theme_text ?? defaultThemeConfig.light.text,
    },
    dark: {
      bg: row?.dark_theme_bg ?? defaultThemeConfig.dark.bg,
      color: row?.dark_theme_color ?? defaultThemeConfig.dark.color,
      text: row?.dark_theme_text ?? defaultThemeConfig.dark.text,
    },
  };
}

/** 将前端主题配置转换为 theme 表写入数据。 */
export function getThemeRowFromConfig(
  userId: string,
  config: ThemeConfig,
): ThemeDatabaseRow {
  return {
    id: userId,
    theme: config.mode,
    texture: config.texture,
    dark_theme_bg: config.dark.bg,
    dark_theme_color: config.dark.color,
    dark_theme_text: config.dark.text,
    light_theme_bg: config.light.bg,
    light_theme_color: config.light.color,
    light_theme_text: config.light.text,
  };
}
