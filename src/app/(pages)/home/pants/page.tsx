import { renderHomePage } from "../page";

/** 裤子分类页面，复用主页壳并切换右侧内容区。 */
export default async function PantsPage() {
  return renderHomePage("/home/pants");
}
