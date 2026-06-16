import HomePage from "@/features/home/home-page";
import { readThemeConfig } from "./theme/env";
import { auth } from "../../auth";
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

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("name,phone,avatar")
    .eq("id", session.user.id)
    .maybeSingle<HomeProfile>();

  return (
    <HomePage
      initialTheme={readThemeConfig()}
      user={{
        avatar: data?.avatar ?? null,
        name: data?.name ?? session.user.name,
        phone: data?.phone ?? session.user.phone,
      }}
    />
  );
}
