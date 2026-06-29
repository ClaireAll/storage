import { listItems } from "@/app/utils/database";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

/** 日用品分类页，负责读取日用品数据并渲染陈列内容。 */
export default async function ToiletriesPage() {
  return renderHomePage({
    activeCategoryHref: "/home/toiletries",
    loadContent: async ({ supabase, userId }) => {
      const toiletriesResult = await listItems(supabase, "toiletries", userId);
      const toiletries = toiletriesResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={toiletries}
            hasColor={false}
            hasSeason={false}
            itemLabel="日用品"
            showCount
          />
        ),
        itemCount: toiletries.length,
      };
    },
  });
}
