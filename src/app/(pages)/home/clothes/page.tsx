import { renderHomePage } from "../page";
import { ClothesGallery } from "./clothes-gallery";
import type { ClothesItem } from "./clothes-type";

/** 衣服分类页，负责读取衣服数据并渲染衣服陈列内容。 */
export default async function ClothesPage() {
  return renderHomePage({
    activeCategoryHref: "/home/clothes",
    loadContent: async ({ supabase, userId }) => {
      const clothesResult = await supabase
        .from("clothes")
        .select("c_id,name,timeStamp,price,color,pic_url,season")
        .eq("id", userId)
        .order("timeStamp", { ascending: false })
        .order("c_id", { ascending: false })
        .returns<ClothesItem[]>();
      const clothes = clothesResult.data ?? [];

      return {
        content: <ClothesGallery clothes={clothes} />,
        itemCount: clothes.length,
      };
    },
  });
}
