import { renderHomePage } from "../page";
import { ClothesGallery } from "../clothes/clothes-gallery";
import type { ClothesItem } from "../clothes/clothes-type";

/** 裤子分类页，负责读取裤子数据并渲染裤子陈列内容。 */
export default async function PantsPage() {
  return renderHomePage({
    activeCategoryHref: "/home/pants",
    loadContent: async ({ supabase, userId }) => {
      const pantsResult = await supabase
        .from("pants")
        .select("p_id,name,timeStamp,price,color,pic_url,season")
        .eq("id", userId)
        .order("timeStamp", { ascending: false })
        .order("p_id", { ascending: false })
        .returns<
          Array<Omit<ClothesItem, "c_id"> & { p_id: ClothesItem["c_id"] }>
        >();
      const pants =
        pantsResult.data?.map(({ p_id, ...item }) => ({
          ...item,
          c_id: p_id,
        })) ?? [];

      return {
        content: <ClothesGallery clothes={pants} itemLabel="裤子" />,
        itemCount: pants.length,
      };
    },
  });
}
