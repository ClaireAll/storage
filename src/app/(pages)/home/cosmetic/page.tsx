import { listItems } from "@/app/utils/database";
import { cosmeticCategoryLabels } from "../constant";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

/** 化妆品分类页，负责读取化妆品数据并渲染陈列内容。 */
export default async function CosmeticPage() {
  return renderHomePage({
    activeCategoryHref: "/home/cosmetic",
    loadContent: async ({ supabase, userId }) => {
      const cosmeticResult = await listItems(supabase, "cosmetic", userId);
      const cosmeticItems = cosmeticResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={cosmeticItems}
            hasColor={false}
            hasSeason={false}
            itemCategoryLabels={cosmeticCategoryLabels}
            itemLabel="化妆品"
            showCount
          />
        ),
        itemCount: cosmeticItems.length,
      };
    },
  });
}
