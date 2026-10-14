import { FastColor } from "@ant-design/fast-color";

/** 禁用透明度的选择器统一接收不透明 HEX，空弹窗也不传透明空值。 */
export function opaqueAtlasColor(value?: string | null): string {
  return new FastColor(value || "#1677ff").setA(1).toHexString();
}

/** 新分类采用随机色相，固定饱和度与亮度避免过暗或过灰。 */
export function randomAtlasColor(): string {
  return new FastColor({ h: Math.random() * 360, s: 0.65, l: 0.55 }).toHexString();
}
