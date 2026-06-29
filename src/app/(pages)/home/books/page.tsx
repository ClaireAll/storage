import { listItems } from "@/app/utils/database";
import { ClothesGallery } from "../clothes/clothes-gallery";
import { renderHomePage } from "../page";

/** 图书分类页，负责读取图书数据并渲染图书陈列内容。 */
export default async function BooksPage() {
  return renderHomePage({
    activeCategoryHref: "/home/books",
    loadContent: async ({ supabase, userId }) => {
      const booksResult = await listItems(supabase, "books", userId);
      const books = booksResult.data ?? [];

      return {
        content: (
          <ClothesGallery
            clothes={books}
            hasBookCategory
            hasColor={false}
            hasDate={false}
            hasSeason={false}
            itemLabel="图书"
          />
        ),
        itemCount: books.length,
      };
    },
  });
}
