import type { ThemeConfig, ThemeMode } from "./types";

export const themeModes: ThemeMode[] = ["light", "dark"];

export const themeColors = [
  "#1677ff",
  "#13c2c2",
  "#52c41a",
  "#faad14",
  "#f5222d",
  "#722ed1",
];

export const defaultThemeConfig: ThemeConfig = {
  mode: "light",
  color: "#1677ff",
};

export function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function isThemeColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
