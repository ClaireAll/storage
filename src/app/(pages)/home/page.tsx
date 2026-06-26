import HomePage from "./home-view";
import {
  getThemeConfigFromRow,
  isThemeMode,
} from "@/app/(pages)/theme/constants";
import type { ThemeDatabaseRow } from "@/app/(pages)/theme/types";
import { createClient } from "@/utils/supabase/server";
import { auth } from "../../../../auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/** 首页使用的用户资料结构。 */
type HomeProfile = {
  /** 用户头像地址，没有时显示默认头像。 */
  avatar?: string | null;
  /** 用户名称。 */
  name?: string | null;
  /** 用户手机号。 */
  phone?: string | null;
};

type HomeContentLoaderContext = {
  /** 当前登录用户 ID。 */
  userId: string;
  /** 当前请求使用的 Supabase 服务端客户端。 */
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type HomeContentResult = {
  /** 当前分类物品数量。 */
  itemCount?: number;
  /** 当前分类页提供的内容区域。 */
  content?: ReactNode;
};

type RenderHomePageOptions = {
  /** 当前路由选中的分类路径。 */
  activeCategoryHref?: string;
  /** 分类页内容加载器，只应由具体分类页面传入。 */
  loadContent?: (
    context: HomeContentLoaderContext,
  ) => Promise<HomeContentResult>;
};

/** 渲染主页壳，分类页可通过 loadContent 注入自己的内容区域。 */
export async function renderHomePage(options: RenderHomePageOptions = {}) {
  const { activeCategoryHref, loadContent } = options;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const contentPromise: Promise<HomeContentResult> = loadContent
    ? loadContent({ supabase, userId: session.user.id })
    : Promise.resolve({});
  const [profileResult, themeResult, contentResult] = await Promise.all([
    supabase
      .from("users")
      .select("name,phone,avatar")
      .eq("id", session.user.id)
      .maybeSingle<HomeProfile>(),
    supabase
      .from("theme")
      .select(
        "id,theme,texture,ani_theme,light_theme_color,light_theme_bg,light_theme_text,dark_theme_color,dark_theme_bg,dark_theme_text",
      )
      .eq("id", session.user.id)
      .maybeSingle<ThemeDatabaseRow>(),
    contentPromise,
  ]);
  const cookieStore = await cookies();
  const themeModeCookie = cookieStore.get("storage-theme-mode")?.value ?? "";
  const themeMode = isThemeMode(themeModeCookie) ? themeModeCookie : undefined;
  const profile = profileResult.data;

  return (
    <HomePage
      activeCategoryHref={activeCategoryHref}
      initialTheme={getThemeConfigFromRow(themeResult.data, themeMode)}
      itemCount={contentResult.itemCount ?? 0}
      user={{
        avatar: profile?.avatar ?? null,
        name: profile?.name ?? session.user.name,
        phone: profile?.phone ?? session.user.phone,
      }}
    >
      {contentResult.content}
    </HomePage>
  );
}

export default async function Home() {
  return renderHomePage();
}
