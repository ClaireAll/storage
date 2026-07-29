import { listItems } from "@/app/utils/database";
import { blogCategoryLabels } from "../constant";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

/** 笔记分类页，负责读取笔记数据并渲染共享陈列内容。 */
export default async function BlogPage() {
  return renderHomePage({
    activeCategoryHref: "/home/blog",
    loadContent: async ({ supabase, userId }) => {
      const blogResult = await listItems(supabase, "blog", userId);
      const blogItems = blogResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={blogItems}
            hasColor={false}
            hasDate={false}
            hasPrice={false}
            hasSeason={false}
            itemCategoryLabels={blogCategoryLabels}
            itemLabel="笔记"
          />
        ),
        itemCount: blogItems.length,
      };
    },
  });
}
