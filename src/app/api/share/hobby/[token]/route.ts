import { deleteHobbyShare, resolveHobbyShare } from "@/app/utils/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../auth";

/** 公开解析请求接收的可选访问密码。 */
type HobbyShareResolvePayload = {
  password?: unknown;
};

/** 按解析结果状态返回公开爱好分享响应。 */
async function respondWithShare(token: string, password?: string) {
  const supabase = await createClient();
  const result = await resolveHobbyShare(supabase, token, password);

  if (result.error || !result.data) {
    return NextResponse.json(
      { message: "读取分享内容失败" },
      { status: 500 },
    );
  }

  if (result.data.status === "not_found") {
    return NextResponse.json(
      { message: "分享链接不存在", status: result.data.status },
      { status: 404 },
    );
  }
  if (result.data.status === "expired") {
    return NextResponse.json(
      { message: "分享链接已失效", status: result.data.status },
      { status: 410 },
    );
  }
  if (result.data.status === "password_required") {
    return NextResponse.json(
      { message: "请输入访问密码", status: result.data.status },
      { status: 401 },
    );
  }
  if (result.data.status === "invalid_password") {
    return NextResponse.json(
      { message: "密码错误，请重新输入", status: result.data.status },
      { status: 401 },
    );
  }

  return NextResponse.json(result.data);
}

/** 在不提供密码时解析公开爱好分享。 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  return respondWithShare(token.trim());
}

/** 使用请求密码解析公开爱好分享。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const payload = (await request.json().catch(() => null)) as
    | HobbyShareResolvePayload
    | null;
  if (
    typeof payload?.password !== "string" ||
    payload.password.length > 64
  ) {
    return NextResponse.json(
      { message: "密码格式无效" },
      { status: 400 },
    );
  }

  const { token } = await params;

  return respondWithShare(token.trim(), payload.password);
}

/** 删除当前登录账号拥有的爱好分享链接。 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
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

  const { token } = await params;
  const result = await deleteHobbyShare(
    adminSupabase,
    session.user.id,
    token.trim(),
  );
  if (result.error) {
    return NextResponse.json(
      { message: "删除分享链接失败" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
