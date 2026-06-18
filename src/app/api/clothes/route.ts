import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { createClient } from "@/utils/supabase/server";

/** 新增衣服接口接收的请求体结构。 */
type ClothesCreatePayload = {
  /** 衣服名字。 */
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

const seasons = ["春", "夏", "秋", "冬"];

/** 校验日期是否为 yyyy-mm-dd 格式。 */
function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 校验颜色是否为十六进制颜色。 */
function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** 新增当前登录用户的一件衣服。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as ClothesCreatePayload;
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
    return NextResponse.json({ message: "请输入衣服名字" }, { status: 400 });
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return NextResponse.json({ message: "请选择购买日期" }, { status: 400 });
  }

  if (price === null || price < 0) {
    return NextResponse.json({ message: "请输入有效价格" }, { status: 400 });
  }

  if (!color || !isHexColor(color)) {
    return NextResponse.json({ message: "请选择衣服颜色" }, { status: 400 });
  }

  if (!picUrl) {
    return NextResponse.json({ message: "请上传衣服图片" }, { status: 400 });
  }

  if (!season || !seasons.includes(season)) {
    return NextResponse.json({ message: "请选择季节" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clothes")
    .insert({
      color,
      id: session.user.id,
      name,
      pic_url: picUrl,
      price,
      season,
      timeStamp,
    })
    .select("id,c_id,name,timeStamp,price,color,pic_url,season")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
