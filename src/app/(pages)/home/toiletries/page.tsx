import { ClothesGallery } from "../clothes/clothes-gallery";
import type { ClothesItem } from "../clothes/clothes-type";
import { renderHomePage } from "../page";

type ToiletriesDatabaseItem = Omit<ClothesItem, "c_id"> & {
  /** 洗漱用品业务主键。 */
  t_id: ClothesItem["c_id"];
};

/** 洗漱用品分类页，负责读取洗漱用品数据并渲染陈列内容。 */
export default async function ToiletriesPage() {
  return renderHomePage({
    activeCategoryHref: "/home/toiletries",
    loadContent: async ({ supabase, userId }) => {
      const toiletriesResult = await supabase
        .from("toiletries")
        .select("t_id,name,timeStamp,price,pic_url,count")
        .eq("id", userId)
        .order("timeStamp", { ascending: false })
        .order("t_id", { ascending: false })
        .returns<ToiletriesDatabaseItem[]>();
      const toiletries =
        toiletriesResult.data?.map(({ t_id, ...item }) => ({
          ...item,
          c_id: t_id,
        })) ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={toiletries}
            hasColor={false}
            hasSeason={false}
            itemLabel="洗漱用品"
            showCount
          />
        ),
        itemCount: toiletries.length,
      };
    },
  });
}
