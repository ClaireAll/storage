import type { ResolvedThemeMode, ThemePalette } from "./types";

/** 解析十六进制颜色，参数 color 为 #RGB 或 #RRGGBB 格式。 */
function parseHexColor(color: string) {
  const normalized = color.trim().replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  if (!/^[\da-f]{6}$/i.test(hex)) {
    return null;
  }

  return {
    b: Number.parseInt(hex.slice(4, 6), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    r: Number.parseInt(hex.slice(0, 2), 16),
  };
}

/** 混合两个十六进制颜色，参数 weight 为 overlay 占比，范围 0 到 100。 */
export function mixHexColor(base: string, overlay: string, weight: number) {
  const baseRgb = parseHexColor(base);
  const overlayRgb = parseHexColor(overlay);

  if (!baseRgb || !overlayRgb) {
    return base;
  }

  const ratio = Math.min(100, Math.max(0, weight)) / 100;
  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0");

  return `#${toHex(baseRgb.r * (1 - ratio) + overlayRgb.r * ratio)}${toHex(
    baseRgb.g * (1 - ratio) + overlayRgb.g * ratio,
  )}${toHex(baseRgb.b * (1 - ratio) + overlayRgb.b * ratio)}`;
}

/** 生成页面通用主题背景色，参数 palette 为当前调色板，mode 为实际明暗模式。 */
export function getThemeShellBackground(
  palette: ThemePalette,
  mode: ResolvedThemeMode,
) {
  return mixHexColor(palette.bg, "#000000", mode === "dark" ? 10 : 8);
}
