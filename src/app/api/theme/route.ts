import { NextResponse } from "next/server";
import {
  isThemeConfig,
  themeConfigCacheKey,
} from "@/app/(pages)/theme/constants";
import { upsertTheme } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { auth } from "../../../../auth";

/** 保存当前登录用户的主题配置，参数 request 为客户端提交的主题配置请求。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = await request.json();

  if (!isThemeConfig(payload)) {
    return NextResponse.json(
      { message: "主题配置无效" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await upsertTheme(supabase, session.user.id, payload);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const response = NextResponse.json(payload);

  response.cookies.set("storage-theme-mode", payload.mode, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set(
    themeConfigCacheKey,
    encodeURIComponent(JSON.stringify(payload)),
    {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    },
  );

  return response;
}
