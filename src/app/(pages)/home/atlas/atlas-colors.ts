import { FastColor } from "@ant-design/fast-color";

/** 禁用透明度的选择器统一接收不透明 HEX，空弹窗也不传透明空值。 */
export function opaqueAtlasColor(value?: string | null): string {
  return new FastColor(value || "#1677ff").setA(1).toHexString();
}

/** 分类颜色在完整 RGB 色域内随机，保持不透明。 */
export function randomAtlasColor(): string {
  return new FastColor({
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  }).toHexString();
}
