import { listItems } from "@/app/utils/database";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

const hobbyCategoryLabels: Record<number, string> = {
  1: "金属拼图",
  2: "数字油画",
  3: "钻石画",
};

/** 爱好分类页，负责读取爱好数据并渲染爱好陈列内容。 */
export default async function HobbyPage() {
  return renderHomePage({
    activeCategoryHref: "/home/hobby",
    loadContent: async ({ supabase, userId }) => {
      const hobbyResult = await listItems(supabase, "hobby", userId);
      const hobbyItems = hobbyResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={hobbyItems}
            hasSeason={false}
            itemCategoryLabels={hobbyCategoryLabels}
            itemLabel="爱好"
          />
        ),
        itemCount: hobbyItems.length,
      };
    },
  });
}
