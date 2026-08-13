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
  {
    name: "经典商务",
    bg: "#F8F9FA",
    color: "#0D6EFD",
    text: "#212529",
    columns: [
      "#0D6EFD",
      "#2A7CF5",
      "#438BE8",
      "#5B9ADD",
      "#1E88C8",
      "#36A2BF",
      "#5AA66E",
      "#C99A20",
    ],
  },
  {
    name: "现代科技",
    bg: "#F4F7F6",
    color: "#00C9A7",
    text: "#1A2B3C",
    columns: [
      "#00C9A7",
      "#13BFAE",
      "#1EADB9",
      "#249BC6",
      "#347ED1",
      "#5C65D4",
      "#8B58C9",
      "#C05BAE",
    ],
  },
  {
    name: "极简黑白",
    bg: "#FFFFFF",
    color: "#000000",
    text: "#333333",
    columns: [
      "#000000",
      "#1F2329",
      "#343A40",
      "#4C535C",
      "#666E78",
      "#838B96",
      "#A3ABB5",
      "#CBD0D6",
    ],
  },
  {
    name: "温暖阳光",
    bg: "#FCF8F2",
    color: "#FF7E5F",
    text: "#4A403A",
    columns: [
      "#FF7E5F",
      "#FF9463",
      "#FFAA66",
      "#FFC06A",
      "#F4CA73",
      "#E3B45E",
      "#D3924F",
      "#BD6F4B",
    ],
  },
  {
    name: "宁静自然",
    bg: "#F0F4F1",
    color: "#2E7D32",
    text: "#1B382B",
    columns: [
      "#2E7D32",
      "#3F8D45",
      "#589C57",
      "#73A96B",
      "#8BB77E",
      "#A5C28F",
      "#7AA77A",
      "#4F8F75",
    ],
  },
  {
    name: "浪漫微甜",
    bg: "#FDF6F8",
    color: "#E91E63",
    text: "#5D4037",
    columns: [
      "#E91E63",
      "#EE3A79",
      "#F0528C",
      "#F06AA0",
      "#E681B2",
      "#D999C2",
      "#C486C6",
      "#A96AC0",
    ],
  },
  {
    name: "权威严谨",
    bg: "#F3F4F6",
    color: "#1E3A8A",
    text: "#111827",
    columns: [
      "#1E3A8A",
      "#274B9A",
      "#315CA8",
      "#3D6DB3",
      "#4A7EBD",
      "#5A8DC5",
      "#6B97BB",
      "#7E8FA8",
    ],
  },
  {
    name: "阳光活力",
    bg: "#FFFBEB",
    color: "#F59E0B",
    text: "#78350F",
    columns: [
      "#F59E0B",
      "#F7AF22",
      "#F8C03B",
      "#F9D257",
      "#F0B34D",
      "#E99533",
      "#DD7729",
      "#CF5F25",
    ],
  },
  {
    name: "优雅知性",
    bg: "#F5EFF8",
    color: "#6B46C1",
    text: "#322043",
    columns: [
      "#6B46C1",
      "#7954C8",
      "#8863CE",
      "#9773D4",
      "#A784D9",
      "#B797DE",
      "#C7ACE3",
      "#D8C2E8",
    ],
  },
  {
    name: "清新明亮",
    bg: "#EBF8FF",
    color: "#3182CE",
    text: "#2B6CB0",
    columns: [
      "#3182CE",
      "#4594D8",
      "#5AA6E0",
      "#70B8E6",
      "#87C9EA",
      "#A0D8ED",
      "#84D4D0",
      "#66C8BD",
    ],
  },
];

/** 深色主题。 */
export const DARK_THEMES: ThemeOption[] = [
  {
    name: "暗夜极客",
    bg: "#121212",
    color: "#00E676",
    text: "#E0E0E0",
    columns: [
      "#00E676",
      "#15EC89",
      "#2BF19A",
      "#43F4AA",
      "#5CF6B9",
      "#76F7C7",
      "#35D9E4",
      "#4AB8F0",
    ],
  },
  {
    name: "暗夜护眼",
    bg: "#1E1E24",
    color: "#BB86FC",
    text: "#F5F5F7",
    columns: [
      "#BB86FC",
      "#C293FD",
      "#CAA0FE",
      "#D2ADFF",
      "#B8A6F4",
      "#A4ACEA",
      "#8EB2DF",
      "#78B6D3",
    ],
  },
  {
    name: "电竞狂潮",
    bg: "#0F0F12",
    color: "#FF2A54",
    text: "#FFFFFF",
    columns: [
      "#FF2A54",
      "#FF3F63",
      "#FF5472",
      "#FF6A83",
      "#FF8195",
      "#FF99A7",
      "#E45CC6",
      "#BC52E0",
    ],
  },
  {
    name: "奢华高定",
    bg: "#1A1A1A",
    color: "#D4AF37",
    text: "#E5E5E5",
    columns: [
      "#D4AF37",
      "#DFC050",
      "#E8CE69",
      "#F0DA83",
      "#DAB76A",
      "#C99A52",
      "#B78241",
      "#A46B35",
    ],
  },
  {
    name: "全息投影",
    bg: "#0D1117",
    color: "#58A6FF",
    text: "#C9D1D9",
    columns: [
      "#58A6FF",
      "#68B2FF",
      "#78BDFF",
      "#88C8FF",
      "#9AD2FF",
      "#8ADFE8",
      "#75E4D2",
      "#8EE6B8",
    ],
  },
  {
    name: "赛博霓虹",
    bg: "#090A0F",
    color: "#FF007F",
    text: "#F0F2F5",
    columns: [
      "#FF007F",
      "#FF1E8D",
      "#FF3C9A",
      "#FA55A9",
      "#E969C2",
      "#CF72DF",
      "#A578FA",
      "#65A7FF",
    ],
  },
  {
    name: "质感毛玻璃",
    bg: "#1C1C1E",
    color: "#30D158",
    text: "#FFFFFF",
    columns: [
      "#30D158",
      "#47D86C",
      "#5DDE80",
      "#74E394",
      "#8BE8A7",
      "#A2ECB9",
      "#7FDBCA",
      "#9FC8E8",
    ],
  },
  {
    name: "落日余晖",
    bg: "#16151B",
    color: "#FF6B6B",
    text: "#EAEAEA",
    columns: [
      "#FF6B6B",
      "#FF7D6C",
      "#FF906E",
      "#FFA171",
      "#FFB576",
      "#F5A06D",
      "#DD7B73",
      "#BF6B8E",
    ],
  },
  {
    name: "深海探秘",
    bg: "#0B131B",
    color: "#00ADB5",
    text: "#EEEEEE",
    columns: [
      "#00ADB5",
      "#12BBC1",
      "#27C8CC",
      "#3FD4D6",
      "#5ADFE0",
      "#76E7E7",
      "#5CB4D8",
      "#4E8FC8",
    ],
  },
  {
    name: "复古胶片",
    bg: "#1C1B1A",
    color: "#DEB887",
    text: "#DCD6CD",
    columns: [
      "#DEB887",
      "#E5C394",
      "#EACDA3",
      "#EFD7B3",
      "#D8B083",
      "#C69568",
      "#B37E54",
      "#956A4D",
    ],
  },
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
