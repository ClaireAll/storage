import { listItems } from "@/app/utils/database";
import { renderHomePage } from "../page";
import { BlogReader } from "./blog-reader";

/** 笔记分类页，负责读取笔记数据并渲染左右阅读布局。 */
export default async function BlogPage() {
  return renderHomePage({
    activeCategoryHref: "/home/blog",
    loadContent: async ({ supabase, userId }) => {
      const blogResult = await listItems(supabase, "blog", userId);
      const blogItems = blogResult.data ?? [];

      return {
        content: <BlogReader items={blogItems} />,
        itemCount: blogItems.length,
      };
    },
  });
}
