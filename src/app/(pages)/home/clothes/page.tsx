import { renderHomePage } from "../page";
import { ClothesGallery } from "./clothes-gallery";
import { listItems } from "@/app/utils/database";

/** 衣服分类页，负责读取衣服数据并渲染衣服陈列内容。 */
export default async function ClothesPage() {
  return renderHomePage({
    activeCategoryHref: "/home/clothes",
    loadContent: async ({ supabase, userId }) => {
      const clothesResult = await listItems(supabase, "clothes", userId);
      const clothes = clothesResult.data ?? [];

      return {
        content: <ClothesGallery clothes={clothes} />,
        itemCount: clothes.length,
      };
    },
  });
}
