import { renderHomePage } from "../page";

/** 裤子分类页，复用主页壳并保留后续裤子陈列扩展入口。 */
export default async function PantsPage() {
  return renderHomePage({ activeCategoryHref: "/home/pants" });
}
