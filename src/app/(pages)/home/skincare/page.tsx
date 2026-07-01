import { listItems } from "@/app/utils/database";
import { skincareCategoryLabels } from "../constant";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

/** 护肤品分类页，负责读取护肤品数据并渲染陈列内容。 */
export default async function SkincarePage() {
  return renderHomePage({
    activeCategoryHref: "/home/skincare",
    loadContent: async ({ supabase, userId }) => {
      const skincareResult = await listItems(supabase, "skincare", userId);
      const skincareItems = skincareResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={skincareItems}
            hasColor={false}
            hasSeason={false}
            itemCategoryLabels={skincareCategoryLabels}
            itemLabel="护肤品"
            showCount
          />
        ),
        itemCount: skincareItems.length,
      };
    },
  });
}
