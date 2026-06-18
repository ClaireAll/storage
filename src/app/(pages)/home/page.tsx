import HomePage from "./home-view";
import {
  getThemeConfigFromRow,
  isThemeMode,
} from "@/app/(pages)/theme/constants";
import type { ThemeDatabaseRow } from "@/app/(pages)/theme/types";
import { auth } from "../../../../auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
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

/** 渲染主页壳，参数 activeCategoryHref 控制右侧内容区展示的分类。 */
export async function renderHomePage(activeCategoryHref?: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [{ data }, { data: themeData }] = await Promise.all([
    supabase
      .from("users")
      .select("name,phone,avatar")
      .eq("id", session.user.id)
      .maybeSingle<HomeProfile>(),
    supabase
      .from("theme")
      .select(
        "id,theme,texture,light_theme_color,light_theme_bg,light_theme_text,dark_theme_color,dark_theme_bg,dark_theme_text",
      )
      .eq("id", session.user.id)
      .maybeSingle<ThemeDatabaseRow>(),
  ]);
  const cookieStore = await cookies();
  const themeModeCookie = cookieStore.get("storage-theme-mode")?.value ?? "";
  const themeMode = isThemeMode(themeModeCookie) ? themeModeCookie : undefined;

  return (
    <HomePage
      activeCategoryHref={activeCategoryHref}
      initialTheme={getThemeConfigFromRow(themeData, themeMode)}
      user={{
        avatar: data?.avatar ?? null,
        name: data?.name ?? session.user.name,
        phone: data?.phone ?? session.user.phone,
      }}
    />
  );
}

export default async function Home() {
  return renderHomePage();
}
