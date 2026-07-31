import { getThemeConfigFromRow } from "@/app/(pages)/theme/constants";
import {
  createHobbyShare,
  getThemeRow,
  listHobbyShares,
  listItems,
} from "@/app/utils/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import {
  flattenHobbyShareSlides,
  getHobbyShareExpiresAt,
  isHobbyShareExpiry,
} from "./share-utils";

/** 创建爱好分享时接收的有效期与可选访问密码。 */
type HobbyShareCreatePayload = {
  expiry?: unknown;
  password?: unknown;
};

/** 列出当前登录账号已经创建的爱好分享链接。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { message: "分享服务配置异常" },
      { status: 500 },
    );
  }

  const result = await listHobbyShares(adminSupabase, session.user.id);
  if (result.error) {
    return NextResponse.json(
      { message: "读取分享链接失败" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    shares: result.data.map((share) => ({
      ...share,
      url: new URL(`/share/hobby/${share.token}`, request.url).toString(),
    })),
  });
}

/** 为已登录用户创建仅含其个人快照的爱好分享链接。 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | HobbyShareCreatePayload
    | null;
  if (!isHobbyShareExpiry(payload?.expiry)) {
    return NextResponse.json({ message: "请选择有效期" }, { status: 400 });
  }

  const password =
    typeof payload?.password === "string" ? payload.password : "";
  if (password.length > 64) {
    return NextResponse.json(
      { message: "密码不能超过 64 个字符" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const [hobbyResult, themeResult] = await Promise.all([
    listItems(supabase, "hobby", session.user.id),
    getThemeRow(supabase, session.user.id),
  ]);
  if (hobbyResult.error || themeResult.error) {
    return NextResponse.json(
      { message: "读取爱好分享内容失败" },
      { status: 500 },
    );
  }

  const slides = flattenHobbyShareSlides(hobbyResult.data);
  if (!slides.length) {
    return NextResponse.json(
      { message: "暂无可分享的爱好图片" },
      { status: 400 },
    );
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { message: "分享服务配置异常" },
      { status: 500 },
    );
  }

  const result = await createHobbyShare(adminSupabase, {
    expiresAt: getHobbyShareExpiresAt(payload.expiry),
    ownerId: session.user.id,
    password,
    slides,
    theme: getThemeConfigFromRow(themeResult.data),
  });
  if (result.error || !result.data) {
    return NextResponse.json(
      { message: "生成分享链接失败" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    expiresAt: result.data.expiresAt,
    token: result.data.token,
    url: new URL(`/share/hobby/${result.data.token}`, request.url).toString(),
  });
}
