import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { createClient } from "@/utils/supabase/server";

/** 新增裤子接口接收的请求体结构。 */
type PantsCreatePayload = {
  /** 裤子名字。 */
  name?: string;
  /** 购买日期，格式为 yyyy-mm-dd。 */
  timeStamp?: string;
  /** 价格。 */
  price?: number;
  /** 颜色，格式为 #rrggbb。 */
  color?: string;
  /** 图片 OSS 公开访问地址。 */
  pic_url?: string;
  /** 季节。 */
  season?: string;
};

/** 更新裤子接口接收的请求体结构。 */
type PantsUpdatePayload = PantsCreatePayload & {
  /** 裤子业务主键。 */
  c_id?: string | number;
};

type PantsDatabaseItem = {
  /** 用户 ID。 */
  id: string;
  /** 裤子业务主键。 */
  p_id: string | number;
  /** 裤子名字。 */
  name: string;
  /** 购买日期。 */
  timeStamp: string;
  /** 价格。 */
  price: number;
  /** 颜色。 */
  color: string;
  /** 图片地址。 */
  pic_url: string;
  /** 季节。 */
  season: string;
};

const seasons = ["春", "夏", "秋", "冬"];
const seasonSeparatorPattern = /\s+/;

/** 校验日期是否为 yyyy-mm-dd 格式。 */
function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 校验颜色是否为十六进制颜色。 */
function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** 校验季节字符串，支持用空格分隔多个季节。 */
function isValidSeasonValue(value: string) {
  const values = value.trim().split(seasonSeparatorPattern).filter(Boolean);

  return values.length > 0 && values.every((season) => seasons.includes(season));
}

/** 将 pants 表字段映射成前端复用的通用物品字段。 */
function mapPantsResponse({ p_id, ...item }: PantsDatabaseItem) {
  return {
    ...item,
    c_id: p_id,
  };
}

/** 新增当前登录用户的一条裤子。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as PantsCreatePayload;
  const name = payload.name?.trim() ?? "";
  const timeStamp = payload.timeStamp?.trim() ?? "";
  const color = payload.color?.trim() ?? "";
  const picUrl = payload.pic_url?.trim() ?? "";
  const season = payload.season?.trim() ?? "";
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;

  if (!name) {
    return NextResponse.json({ message: "请输入裤子名字" }, { status: 400 });
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return NextResponse.json({ message: "请选择购买日期" }, { status: 400 });
  }

  if (price === null || price < 0) {
    return NextResponse.json({ message: "请输入有效价格" }, { status: 400 });
  }

  if (!color || !isHexColor(color)) {
    return NextResponse.json({ message: "请选择裤子颜色" }, { status: 400 });
  }

  if (!picUrl) {
    return NextResponse.json({ message: "请上传裤子图片" }, { status: 400 });
  }

  if (!season || !isValidSeasonValue(season)) {
    return NextResponse.json({ message: "请选择季节" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pants")
    .insert({
      color,
      id: session.user.id,
      name,
      pic_url: picUrl,
      price,
      season,
      timeStamp,
    })
    .select("id,p_id,name,timeStamp,price,color,pic_url,season")
    .single<PantsDatabaseItem>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(mapPantsResponse(data));
}

/** 更新当前登录用户的一条裤子。 */
export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as PantsUpdatePayload;
  const cId =
    typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
  const name = payload.name?.trim() ?? "";
  const timeStamp = payload.timeStamp?.trim() ?? "";
  const color = payload.color?.trim() ?? "";
  const picUrl = payload.pic_url?.trim() ?? "";
  const season = payload.season?.trim() ?? "";
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;

  if (!cId) {
    return NextResponse.json({ message: "缺少裤子标识" }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ message: "请输入裤子名字" }, { status: 400 });
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return NextResponse.json({ message: "请选择购买日期" }, { status: 400 });
  }

  if (price === null || price < 0) {
    return NextResponse.json({ message: "请输入有效价格" }, { status: 400 });
  }

  if (!color || !isHexColor(color)) {
    return NextResponse.json({ message: "请选择裤子颜色" }, { status: 400 });
  }

  if (!picUrl) {
    return NextResponse.json({ message: "请上传裤子图片" }, { status: 400 });
  }

  if (!season || !isValidSeasonValue(season)) {
    return NextResponse.json({ message: "请选择季节" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pants")
    .update({
      color,
      name,
      pic_url: picUrl,
      price,
      season,
      timeStamp,
    })
    .eq("id", session.user.id)
    .eq("p_id", cId)
    .select("id,p_id,name,timeStamp,price,color,pic_url,season")
    .single<PantsDatabaseItem>();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(mapPantsResponse(data));
}
