/** 主题显示模式，system 会跟随浏览器系统外观。 */
export type ThemeMode = "light" | "dark" | "system";

/** 已解析后的实际主题模式，只包含可直接渲染的浅色或深色。 */
export type ResolvedThemeMode = "light" | "dark";

/** 主题背景纹路类型，用于主页两侧和主题预览区域。 */
export type ThemeTexture = "none" | "bokeh" | "geometry" | "meteor";

/** 单个明暗模式下使用的主题调色板。 */
export type ThemePalette = {
  /** 主题色，用于按钮、链接和头像底色。 */
  color: string;
  /** 页面背景色。 */
  bg: string;
  /** 主要文字颜色。 */
  text: string;
};

/** 可供用户选择的单模式主题配置。 */
export type ThemeOption = ThemePalette & {
  /** 预设展示名称。 */
  name: string;
};

/** 用户完整主题配置。 */
export type ThemeConfig = {
  /** 用户选择的主题显示模式。 */
  mode: ThemeMode;
  /** 浅色模式调色板。 */
  light: ThemePalette;
  /** 深色模式调色板。 */
  dark: ThemePalette;
  /** 背景纹路样式。 */
  texture: ThemeTexture;
};

/** theme 表行数据结构。 */
export type ThemeDatabaseRow = {
  /** 用户 id，同时作为 theme 表主键。 */
  id: string;
  /** 主题显示模式，对应数据库 theme 字段。 */
  theme: string | null;
  /** 背景纹路，对应数据库 texture 字段。 */
  texture: string | null;
  /** 浅色主题主题色。 */
  light_theme_color: string | null;
  /** 浅色主题背景色。 */
  light_theme_bg: string | null;
  /** 浅色主题文字颜色。 */
  light_theme_text: string | null;
  /** 深色主题主题色。 */
  dark_theme_color: string | null;
  /** 深色主题背景色。 */
  dark_theme_bg: string | null;
  /** 深色主题文字颜色。 */
  dark_theme_text: string | null;
};
