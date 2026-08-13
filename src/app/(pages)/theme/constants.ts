import type {
  ThemeConfig,
  ThemeDatabaseRow,
  ThemeMode,
  ThemeOption,
  ThemeColumns,
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
  { name: "经典商务", bg: "#F8F9FA", color: "#0D6EFD", text: "#212529", columns: ["#0D6EFD", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#F97316", "#8B5CF6", "#EC4899"] },
  { name: "现代科技", bg: "#F4F7F6", color: "#00C9A7", text: "#1A2B3C", columns: ["#00C9A7", "#22D3EE", "#3B82F6", "#8B5CF6", "#F472B6", "#FB7185", "#FBBF24", "#84CC16"] },
  { name: "极简黑白", bg: "#FFFFFF", color: "#000000", text: "#333333", columns: ["#111827", "#4B5563", "#6B7280", "#9CA3AF", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B"] },
  { name: "温暖阳光", bg: "#FCF8F2", color: "#FF7E5F", text: "#4A403A", columns: ["#FF7E5F", "#F59E0B", "#FBBF24", "#F97316", "#EF4444", "#EC4899", "#A855F7", "#14B8A6"] },
  { name: "宁静自然", bg: "#F0F4F1", color: "#2E7D32", text: "#1B382B", columns: ["#2E7D32", "#65A30D", "#84CC16", "#0D9488", "#14B8A6", "#0284C7", "#F59E0B", "#A16207"] },
  { name: "浪漫微甜", bg: "#FDF6F8", color: "#E91E63", text: "#5D4037", columns: ["#E91E63", "#F43F5E", "#FB7185", "#F472B6", "#A855F7", "#8B5CF6", "#22C55E", "#F59E0B"] },
  { name: "权威严谨", bg: "#F3F4F6", color: "#1E3A8A", text: "#111827", columns: ["#1E3A8A", "#2563EB", "#0EA5E9", "#0891B2", "#0F766E", "#16A34A", "#CA8A04", "#9333EA"] },
  { name: "阳光活力", bg: "#FFFBEB", color: "#F59E0B", text: "#78350F", columns: ["#F59E0B", "#FBBF24", "#F97316", "#FB7185", "#EF4444", "#84CC16", "#0EA5E9", "#8B5CF6"] },
  { name: "优雅知性", bg: "#F5EFF8", color: "#6B46C1", text: "#322043", columns: ["#6B46C1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899", "#0EA5E9", "#14B8A6", "#F59E0B"] },
  { name: "清新明亮", bg: "#EBF8FF", color: "#3182CE", text: "#2B6CB0", columns: ["#3182CE", "#0EA5E9", "#06B6D4", "#14B8A6", "#22C55E", "#84CC16", "#F59E0B", "#8B5CF6"] },
];

/** 深色主题。 */
export const DARK_THEMES: ThemeOption[] = [
  { name: "暗夜极客", bg: "#121212", color: "#00E676", text: "#E0E0E0", columns: ["#00E676", "#00D4FF", "#4F9DFF", "#A78BFA", "#F472B6", "#FFB020", "#2DD4BF", "#B8F34A"] },
  { name: "暗夜护眼", bg: "#1E1E24", color: "#BB86FC", text: "#F5F5F7", columns: ["#BB86FC", "#A78BFA", "#60A5FA", "#22D3EE", "#2DD4BF", "#A3E635", "#FBBF24", "#FB7185"] },
  { name: "电竞狂潮", bg: "#0F0F12", color: "#FF2A54", text: "#FFFFFF", columns: ["#FF2A54", "#FF6B00", "#FACC15", "#A3E635", "#22D3EE", "#38BDF8", "#A78BFA", "#F472B6"] },
  { name: "奢华高定", bg: "#1A1A1A", color: "#D4AF37", text: "#E5E5E5", columns: ["#D4AF37", "#F2C14E", "#E7C873", "#C084FC", "#A78BFA", "#38BDF8", "#2DD4BF", "#FB7185"] },
  { name: "全息投影", bg: "#0D1117", color: "#58A6FF", text: "#C9D1D9", columns: ["#58A6FF", "#38BDF8", "#22D3EE", "#2DD4BF", "#A3E635", "#FBBF24", "#FB7185", "#C084FC"] },
  { name: "赛博霓虹", bg: "#090A0F", color: "#FF007F", text: "#F0F2F5", columns: ["#FF007F", "#FF4D9D", "#A855F7", "#7C3AED", "#22D3EE", "#00E5FF", "#A3E635", "#FACC15"] },
  { name: "质感毛玻璃", bg: "#1C1C1E", color: "#30D158", text: "#FFFFFF", columns: ["#30D158", "#2DD4BF", "#38BDF8", "#60A5FA", "#A78BFA", "#F472B6", "#FBBF24", "#A3E635"] },
  { name: "落日余晖", bg: "#16151B", color: "#FF6B6B", text: "#EAEAEA", columns: ["#FF6B6B", "#FB923C", "#FBBF24", "#F472B6", "#C084FC", "#818CF8", "#38BDF8", "#2DD4BF"] },
  { name: "深海探秘", bg: "#0B131B", color: "#00ADB5", text: "#EEEEEE", columns: ["#00ADB5", "#22D3EE", "#38BDF8", "#60A5FA", "#818CF8", "#A78BFA", "#2DD4BF", "#A3E635"] },
  { name: "复古胶片", bg: "#1C1B1A", color: "#DEB887", text: "#DCD6CD", columns: ["#DEB887", "#D6A56A", "#F59E0B", "#E07A5F", "#C08497", "#A78BFA", "#5FA8D3", "#8AB17D"] },
];

export const defaultThemeConfig: ThemeConfig = {
  aniTheme: null,
  hiddenCategoryKeys: [],
  light: LIGHT_THEMES[0],
  dark: DARK_THEMES[0],
  mode: "system",
  texture: THEME_TEXTURES[0].value,
};

export const themeConfigCacheKey = "storage-theme-config";
export const themeConfigChangeEventName = "storage-theme-config-change";

function normalizeThemeColorForComparison(value: string) {
  return value.trim().toLowerCase();
}

/** 查找与当前调色板完全匹配的主题，参数 options 为主题列表，value 为当前调色板。 */
export function findThemeOption(options: ThemeOption[], value: ThemePalette) {
  return options.find(
    (option) =>
      normalizeThemeColorForComparison(option.bg) ===
        normalizeThemeColorForComparison(value.bg) &&
      normalizeThemeColorForComparison(option.color) ===
        normalizeThemeColorForComparison(value.color) &&
      normalizeThemeColorForComparison(option.text) ===
        normalizeThemeColorForComparison(value.text),
  );
}

/** 读取调色板对应的图表颜色；自定义调色板沿用当前明暗模式的可读性序列。 */
export function getThemeColumns(
  palette: ThemePalette,
  mode: Exclude<ThemeMode, "system">,
): ThemeColumns {
  const themes = mode === "dark" ? DARK_THEMES : LIGHT_THEMES;
  const selectedTheme = findThemeOption(themes, palette);

  if (selectedTheme) {
    return selectedTheme.columns;
  }

  const fallbackColumns = themes[0].columns;

  return [
    palette.color,
    fallbackColumns[1],
    fallbackColumns[2],
    fallbackColumns[3],
    fallbackColumns[4],
    fallbackColumns[5],
    fallbackColumns[6],
    fallbackColumns[7],
  ];
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
    (config.aniTheme === undefined ||
      config.aniTheme === null ||
      (typeof config.aniTheme === "string" &&
        isThemeColor(config.aniTheme))) &&
    Array.isArray(config.hiddenCategoryKeys) &&
    config.hiddenCategoryKeys.every((key) => typeof key === "string") &&
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
    aniTheme:
      row?.ani_theme && isThemeColor(row.ani_theme) ? row.ani_theme : null,
    hiddenCategoryKeys:
      row?.hidden_category_keys?.filter(
        (key): key is string => typeof key === "string",
      ) ?? [],
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
    ani_theme: config.aniTheme ?? null,
    hidden_category_keys: config.hiddenCategoryKeys,
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
