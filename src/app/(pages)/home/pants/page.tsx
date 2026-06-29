import { renderHomePage } from "../page";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { listItems } from "@/app/utils/database";

/** 裤子分类页，负责读取裤子数据并渲染裤子陈列内容。 */
export default async function PantsPage() {
  return renderHomePage({
    activeCategoryHref: "/home/pants",
    loadContent: async ({ supabase, userId }) => {
      const pantsResult = await listItems(supabase, "pants", userId);
      const pants = pantsResult.data ?? [];

      return {
        content: <ClothesGallery clothes={pants} itemLabel="裤子" />,
        itemCount: pants.length,
      };
    },
  });
}
