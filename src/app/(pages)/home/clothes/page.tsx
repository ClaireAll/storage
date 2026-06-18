import { renderHomePage } from "../page";

/** 衣服分类页面，复用主页壳并切换右侧内容区。 */
export default async function ClothesPage() {
  return renderHomePage("/home/clothes");
}
