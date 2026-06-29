import {
  createItem,
  deleteItem,
  getItemPicture,
  updateItem,
} from "@/app/utils/database";
import { deleteOwnOssObject } from "@/utils/oss-server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type PantsCreatePayload = {
  color?: string;
  name?: string;
  pic_url?: string;
  price?: number;
  season?: string;
  timeStamp?: string;
};

type PantsUpdatePayload = PantsCreatePayload & {
  c_id?: string | number;
};

type PantsDeletePayload = {
  c_id?: string | number;
};

const seasons = ["春", "夏", "秋", "冬"];
const seasonSeparatorPattern = /\s+/;

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidSeasonValue(value: string) {
  const values = value.trim().split(seasonSeparatorPattern).filter(Boolean);

  return values.length > 0 && values.every((season) => seasons.includes(season));
}

function getPantsId(payload: PantsUpdatePayload | PantsDeletePayload) {
  return typeof payload.c_id === "number" || typeof payload.c_id === "string"
    ? String(payload.c_id).trim()
    : "";
}

function parsePantsValues(payload: PantsCreatePayload) {
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;

  return {
    color: payload.color?.trim() ?? "",
    name: payload.name?.trim() ?? "",
    picUrl: payload.pic_url?.trim() ?? "",
    price,
    season: payload.season?.trim() ?? "",
    timeStamp: payload.timeStamp?.trim() ?? "",
  };
}

function validatePantsValues({
  color,
  name,
  picUrl,
  price,
  season,
  timeStamp,
}: ReturnType<typeof parsePantsValues>) {
  if (!name) {
    return "请输入裤子名字";
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return "请选择购买日期";
  }

  if (price === null || price < 0) {
    return "请输入有效价格";
  }

  if (!color || !isHexColor(color)) {
    return "请选择裤子颜色";
  }

  if (!picUrl) {
    return "请上传裤子图片";
  }

  if (!season || !isValidSeasonValue(season)) {
    return "请选择季节";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parsePantsValues((await request.json()) as PantsCreatePayload);
  const validationMessage = validatePantsValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(
    supabase,
    "pants",
    session.user.id,
    {
      color: values.color,
      name: values.name,
      pic_url: values.picUrl,
      price: values.price ?? 0,
      season: values.season,
      timeStamp: values.timeStamp,
    },
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as PantsUpdatePayload;
  const pantsId = getPantsId(payload);
  const values = parsePantsValues(payload);
  const validationMessage = validatePantsValues(values);

  if (!pantsId) {
    return NextResponse.json({ message: "缺少裤子标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await updateItem(
    supabase,
    "pants",
    session.user.id,
    pantsId,
    {
      color: values.color,
      name: values.name,
      pic_url: values.picUrl,
      price: values.price ?? 0,
      season: values.season,
      timeStamp: values.timeStamp,
    },
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as PantsDeletePayload;
  const pantsId = getPantsId(payload);

  if (!pantsId) {
    return NextResponse.json({ message: "缺少裤子标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentPants, error: currentPantsError } =
    await getItemPicture(supabase, "pants", session.user.id, pantsId);

  if (currentPantsError) {
    return NextResponse.json(
      { message: currentPantsError.message },
      { status: 500 },
    );
  }

  if (!currentPants) {
    return NextResponse.json({ message: "裤子不存在" }, { status: 404 });
  }

  try {
    await deleteOwnOssObject(currentPants.pic_url, session.user.id, ["pants"]);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除图片失败" },
      { status: 500 },
    );
  }

  const { error } = await deleteItem(
    supabase,
    "pants",
    session.user.id,
    pantsId,
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
