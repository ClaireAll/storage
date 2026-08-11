import { cn } from "@/lib/utils";

/** 登录页左侧图片展示区域的外层容器样式。 */
export const heroSectionClassName =
  "relative min-h-dvh overflow-hidden max-md:min-h-80";
/** 登录页左侧背景图片的铺满裁切样式。 */
export const heroImageClassName = "object-cover";
/** 登录页左侧图片上方的渐变遮罩样式。 */
export const heroOverlayClassName =
  "absolute inset-0 bg-[linear-gradient(90deg,rgb(12_28_19/46%),rgb(12_28_19/10%))] p-16 text-white max-md:p-8";
/** 登录页左侧年月日信息的居中定位样式。 */
export const datePanelClassName =
  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-md:top-[52%]";
/** 登录页左侧 Storage 品牌标题的渐变字体样式。 */
export const heroBrandClassName =
  "mb-5.5 block bg-[linear-gradient(90deg,#26d9ff,#f064b7_46%,#f6df72)] bg-clip-text font-['Dancing_Script',cursive] text-[clamp(36px,4.8vw,76px)] leading-[1.1] font-black text-transparent [text-shadow:0_12px_42px_rgb(23_205_255/18%)] max-md:text-[34px]";
/** 登录页左侧日期卡片横向排列的容器样式。 */
export const dateRowClassName = "flex justify-center gap-3.5";
/** 登录页左侧日期数字的字号与行高样式。 */
export const dateNumberClassName = "text-[28px] leading-none";
/** 登录页左侧下方说明文案的定位和对齐样式。 */
export const heroCopyClassName =
  "absolute bottom-14 left-1/2 max-w-90 -translate-x-1/2 text-center max-md:bottom-8 max-md:left-8 max-md:max-w-75 max-md:translate-x-0 max-md:text-left";
/** 登录页左侧说明标题的文字颜色样式。 */
export const heroTitleClassName = "text-white!";
/** 登录页左侧说明正文的字号和透明度样式。 */
export const heroTextClassName = "text-base! text-[rgb(255_255_255/82%)]!";
/** 登录页右侧登录卡片的宽度和阴影样式。 */
export const loginCardClassName = "w-full max-w-100 border-0 shadow-none";
/** 登录页右侧 Storage 品牌文字的样式。 */
export const loginBrandClassName =
  "mb-4.5 inline-block text-2xl! leading-none! font-extrabold text-[#22b96f]";

/** 登录页整体网格布局的基础样式。 */
const loginPageBaseClassName =
  "app-textured-shell app-texture-bokeh relative grid min-h-dvh grid-cols-[2fr_1fr] max-md:grid-cols-1";
/** 登录页整体深色主题背景样式。 */
const loginPageDarkClassName = "bg-[#101413]";
/** 登录页整体浅色主题背景样式。 */
const loginPageLightClassName = "bg-[#eef0ed]";
/** 登录页左侧年份文字的基础样式。 */
const yearClassName =
  "mb-4.5 block text-3xl font-extrabold [text-shadow:0_2px_18px_rgb(0_0_0/28%)] max-md:text-2xl";
/** 登录页左侧年份文字在深色主题下的颜色样式。 */
const yearDarkClassName = "text-white";
/** 登录页左侧年份文字在浅色主题下的颜色样式。 */
const yearLightClassName = "text-[#e9fbff]";
/** 登录页左侧月日卡片的基础样式。 */
const dateCardClassName =
  "flex h-22.5 min-w-19.5 flex-col items-center justify-center rounded-lg border p-3.5 shadow-[0_16px_36px_rgb(0_0_0/18%)] max-md:h-19 max-md:min-w-17";
/** 登录页左侧月日卡片在深色主题下的样式。 */
const dateCardDarkClassName = "border-white/18 bg-[#141414]/46 text-white";
/** 登录页左侧月日卡片在浅色主题下的样式。 */
const dateCardLightClassName =
  "border-white/38 bg-white/28 text-[#f4feff] backdrop-blur-[2px]";
/** 登录页左侧月日标签的基础分割线样式。 */
const dateLabelClassName = "mt-2.5 w-full border-t pt-2 text-sm";
/** 登录页左侧月日标签在深色主题下的分割线样式。 */
const dateLabelDarkClassName = "border-white/28";
/** 登录页左侧月日标签在浅色主题下的分割线样式。 */
const dateLabelLightClassName = "border-[#d9fbff]/42";
/** 登录页右侧表单区域的基础布局样式。 */
const formPanelBaseClassName =
  "flex min-h-dvh items-center justify-center px-11 pb-12 pt-21 max-md:min-h-auto max-md:px-5 max-md:pb-8 max-md:pt-18";
/** 登录页右侧表单区域在深色主题下的背景样式。 */
const formPanelDarkClassName = "bg-[#141414]";
/** 登录页右侧表单区域在浅色主题下的背景样式。 */
const formPanelLightClassName = "bg-white";
/** 登录表单用于限定输入框样式覆盖范围的基础类名。 */
const authFormBaseClassName = "login-auth-form";
/** 登录表单在深色主题下用于输入框样式覆盖的类名。 */
const authFormDarkClassName = "login-auth-form-dark";
/** 登录表单在浅色主题下用于输入框样式覆盖的类名。 */
const authFormLightClassName = "login-auth-form-light";

/** 根据当前明暗主题生成登录页根容器的 className，参数 isDark 表示是否为深色主题。 */
export function getLoginPageClassName(isDark: boolean) {
  return cn(
    loginPageBaseClassName,
    isDark ? loginPageDarkClassName : loginPageLightClassName,
  );
}

/** 根据当前明暗主题生成表单区域的 className，参数 isDark 表示是否为深色主题。 */
export function getFormPanelClassName(isDark: boolean) {
  return cn(
    formPanelBaseClassName,
    isDark ? formPanelDarkClassName : formPanelLightClassName,
  );
}

/** 根据当前明暗主题生成日期年份的 className，参数 isDark 表示是否为深色主题。 */
export function getYearClassName(isDark: boolean) {
  return cn(yearClassName, isDark ? yearDarkClassName : yearLightClassName);
}

/** 根据当前明暗主题生成日期卡片的 className，参数 isDark 表示是否为深色主题。 */
export function getDateCardClassName(isDark: boolean) {
  return cn(
    dateCardClassName,
    isDark ? dateCardDarkClassName : dateCardLightClassName,
  );
}

/** 根据当前明暗主题生成日期标签的 className，参数 isDark 表示是否为深色主题。 */
export function getDateLabelClassName(isDark: boolean) {
  return cn(
    dateLabelClassName,
    isDark ? dateLabelDarkClassName : dateLabelLightClassName,
  );
}

/** 根据当前明暗主题生成登录表单的 className，参数 isDark 表示是否为深色主题。 */
export function getAuthFormClassName(isDark: boolean) {
  return cn(
    authFormBaseClassName,
    isDark ? authFormDarkClassName : authFormLightClassName,
  );
}
