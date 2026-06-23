import type { ResolvedThemeMode, ThemePalette } from "./types";

type ParsedColor = {
  /** 红色通道，范围 0-255。 */
  r: number;
  /** 绿色通道，范围 0-255。 */
  g: number;
  /** 蓝色通道，范围 0-255。 */
  b: number;
  /** 透明度通道，范围 0-1。 */
  a: number;
};

/** 将数值限制在指定范围内。 */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 解析十六进制颜色，支持 #RGB、#RGBA、#RRGGBB、#RRGGBBAA。 */
function parseHexColor(color: string): ParsedColor | null {
  const normalized = color.trim().replace(/^#/, "");
  const hex =
    normalized.length === 3 || normalized.length === 4
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(hex)) {
    return null;
  }

  return {
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
    b: Number.parseInt(hex.slice(4, 6), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    r: Number.parseInt(hex.slice(0, 2), 16),
  };
}

/** 解析 rgb 或 rgba 颜色字符串。 */
function parseRgbColor(color: string): ParsedColor | null {
  const match = color
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+%?))?\s*\)$/i,
    );

  if (!match) {
    return null;
  }

  const alphaValue = match[4];
  const alpha = alphaValue
    ? alphaValue.endsWith("%")
      ? Number.parseFloat(alphaValue) / 100
      : Number.parseFloat(alphaValue)
    : 1;

  return {
    a: clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1),
    b: clamp(Number.parseFloat(match[3]), 0, 255),
    g: clamp(Number.parseFloat(match[2]), 0, 255),
    r: clamp(Number.parseFloat(match[1]), 0, 255),
  };
}

/** 解析主题颜色字符串。 */
export function parseThemeColor(color: string): ParsedColor | null {
  return parseHexColor(color) ?? parseRgbColor(color);
}

/** 判断传入字符串是否为主题支持的颜色格式。 */
export function isSupportedThemeColor(color: string) {
  return parseThemeColor(color) !== null;
}

/** 将解析后的颜色转为 CSS rgba 字符串。 */
function toRgbaColor({ a, b, g, r }: ParsedColor) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(
    b,
  )}, ${Number(a.toFixed(3))})`;
}

/** 为任意主题颜色应用透明度。 */
export function withColorAlpha(color: string, alpha: number) {
  const parsedColor = parseThemeColor(color);

  if (!parsedColor) {
    return color;
  }

  return toRgbaColor({
    ...parsedColor,
    a: clamp(parsedColor.a * alpha, 0, 1),
  });
}

/** 根据背景色计算可读文字色，参数 color 为主题色。 */
export function getReadableTextColor(color: string) {
  const rgb = parseThemeColor(color);

  if (!rgb) {
    return "#ffffff";
  }

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  return brightness > 150 ? "#252833" : "#ffffff";
}

/** 混合两个主题颜色，参数 weight 为 overlay 占比，范围 0 到 100。 */
export function mixHexColor(base: string, overlay: string, weight: number) {
  const baseRgb = parseThemeColor(base);
  const overlayRgb = parseThemeColor(overlay);

  if (!baseRgb || !overlayRgb) {
    return base;
  }

  const ratio = clamp(weight, 0, 100) / 100;

  return toRgbaColor({
    a: baseRgb.a * (1 - ratio) + overlayRgb.a * ratio,
    b: baseRgb.b * (1 - ratio) + overlayRgb.b * ratio,
    g: baseRgb.g * (1 - ratio) + overlayRgb.g * ratio,
    r: baseRgb.r * (1 - ratio) + overlayRgb.r * ratio,
  });
}

/** 生成页面通用主题背景色，参数 palette 为当前调色板，mode 为实际明暗模式。 */
export function getThemeShellBackground(
  palette: ThemePalette,
  mode: ResolvedThemeMode,
) {
  return mixHexColor(palette.bg, "#000000", mode === "dark" ? 10 : 8);
}

/** 生成指定范围内的随机浮点数，参数 digits 控制保留小数位。 */
export function randomFloat(min: number, max: number, digits = 1) {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(digits));
}

/** 生成指定范围内的随机整数，包含 min 和 max。 */
export function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** 从列表中随机选择一项。 */
export function pick<T>(values: T[]): T {
  return values[randomInt(0, values.length - 1)];
}
