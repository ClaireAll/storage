import { deleteOwnOssObject } from "@/utils/oss-server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

/** 新增洗漱用品接口接收的请求体结构。 */
type ToiletriesCreatePayload = {
  /** 洗漱用品名字。 */
  name?: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp?: string;
  /** 图片 OSS 公开访问地址。 */
  pic_url?: string;
  /** 价格。 */
  price?: number;
  /** 数量。 */
  count?: number;
};

/** 更新洗漱用品接口接收的请求体结构。 */
type ToiletriesUpdatePayload = ToiletriesCreatePayload & {
  /** 前端复用弹窗提交的通用业务主键。 */
  c_id?: string | number;
  /** 洗漱用品业务主键。 */
  t_id?: string | number;
};

type ToiletriesDeletePayload = {
  /** 前端复用弹窗提交的通用业务主键。 */
  c_id?: string | number;
  /** 洗漱用品业务主键。 */
  t_id?: string | number;
};

type ToiletriesDatabaseItem = {
  /** 用户 ID。 */
  id: string;
  /** 洗漱用品业务主键。 */
  t_id: string | number;
  /** 洗漱用品名字。 */
  name: string;
  /** 购买日期。 */
  timeStamp: string;
  /** 图片地址。 */
  pic_url: string;
  /** 价格。 */
  price: number;
  /** 数量。 */
  count: number;
};

/** 校验日期是否为 yyyy-mm-dd 格式。 */
function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 从前端通用 id 或数据库 t_id 中取出洗漱用品业务主键。 */
function getToiletriesId(payload: ToiletriesUpdatePayload | ToiletriesDeletePayload) {
  return typeof payload.t_id === "number" || typeof payload.t_id === "string"
    ? String(payload.t_id).trim()
    : typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
}

/** 将 toiletries 表字段映射成前端复用的通用物品字段。 */
function mapToiletriesResponse({ t_id, ...item }: ToiletriesDatabaseItem) {
  return {
    ...item,
    c_id: t_id,
  };
}

/** 新增当前登录用户的一件洗漱用品。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as ToiletriesCreatePayload;
  const name = payload.name?.trim() ?? "";
  const timeStamp = payload.timeStamp?.trim() ?? "";
  const picUrl = payload.pic_url?.trim() ?? "";
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;
  const count =
    typeof payload.count === "number" && Number.isFinite(payload.count)
      ? Math.floor(payload.count)
      : null;

  if (!name) {
    return NextResponse.json(
      { message: "请输入洗漱用品名字" },
      { status: 400 },
    );
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return NextResponse.json({ message: "请选择购买日期" }, { status: 400 });
  }

  if (price === null || price < 0) {
    return NextResponse.json({ message: "请输入有效价格" }, { status: 400 });
  }

  if (count === null || count < 1) {
    return NextResponse.json({ message: "请输入有效数量" }, { status: 400 });
  }

  if (!picUrl) {
    return NextResponse.json(
      { message: "请上传洗漱用品图片" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toiletries")
    .insert({
      count,
      id: session.user.id,
      name,
      pic_url: picUrl,
      price,
      timeStamp,
    })
    .select("id,t_id,name,timeStamp,pic_url,price,count")
    .single<ToiletriesDatabaseItem>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(mapToiletriesResponse(data));
}

/** 更新当前登录用户的一件洗漱用品。 */
export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as ToiletriesUpdatePayload;
  const tId = getToiletriesId(payload);
  const name = payload.name?.trim() ?? "";
  const timeStamp = payload.timeStamp?.trim() ?? "";
  const picUrl = payload.pic_url?.trim() ?? "";
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;
  const count =
    typeof payload.count === "number" && Number.isFinite(payload.count)
      ? Math.floor(payload.count)
      : null;

  if (!tId) {
    return NextResponse.json(
      { message: "缺少洗漱用品标识" },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { message: "请输入洗漱用品名字" },
      { status: 400 },
    );
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return NextResponse.json({ message: "请选择购买日期" }, { status: 400 });
  }

  if (price === null || price < 0) {
    return NextResponse.json({ message: "请输入有效价格" }, { status: 400 });
  }

  if (count === null || count < 1) {
    return NextResponse.json({ message: "请输入有效数量" }, { status: 400 });
  }

  if (!picUrl) {
    return NextResponse.json(
      { message: "请上传洗漱用品图片" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("toiletries")
    .update({
      count,
      name,
      pic_url: picUrl,
      price,
      timeStamp,
    })
    .eq("id", session.user.id)
    .eq("t_id", tId)
    .select("id,t_id,name,timeStamp,pic_url,price,count")
    .single<ToiletriesDatabaseItem>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(mapToiletriesResponse(data));
}

/** 删除当前登录用户的一件洗漱用品，并同步删除 OSS 图片。 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as ToiletriesDeletePayload;
  const tId = getToiletriesId(payload);

  if (!tId) {
    return NextResponse.json(
      { message: "缺少洗漱用品标识" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: currentToiletries, error: currentToiletriesError } =
    await supabase
      .from("toiletries")
      .select("pic_url")
      .eq("id", session.user.id)
      .eq("t_id", tId)
      .maybeSingle<{ pic_url: string }>();

  if (currentToiletriesError) {
    return NextResponse.json(
      { message: currentToiletriesError.message },
      { status: 500 },
    );
  }

  if (!currentToiletries) {
    return NextResponse.json({ message: "洗漱用品不存在" }, { status: 404 });
  }

  try {
    await deleteOwnOssObject(currentToiletries.pic_url, session.user.id, [
      "toiletries",
    ]);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除图片失败" },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("toiletries")
    .delete()
    .eq("id", session.user.id)
    .eq("t_id", tId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
