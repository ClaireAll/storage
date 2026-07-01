import { randomUUID } from "crypto";
import { cosmeticCategoryOptions } from "@/app/(pages)/home/constant";
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

type CosmeticCreatePayload = {
  category?: number;
  count?: number;
  name?: string;
  pic_url?: string;
  price?: number;
  timeStamp?: string;
};

type CosmeticUpdatePayload = CosmeticCreatePayload & {
  c_id?: string | number;
};

type CosmeticDeletePayload = {
  c_id?: string | number;
};

const supportedCosmeticCategories = cosmeticCategoryOptions.map(
  ({ value }) => value,
);

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getCosmeticId(payload: CosmeticUpdatePayload | CosmeticDeletePayload) {
  return typeof payload.c_id === "number" || typeof payload.c_id === "string"
    ? String(payload.c_id).trim()
    : "";
}

function parseCosmeticValues(payload: CosmeticCreatePayload) {
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;
  const count =
    typeof payload.count === "number" && Number.isFinite(payload.count)
      ? Math.floor(payload.count)
      : null;
  const category =
    typeof payload.category === "number" && Number.isInteger(payload.category)
      ? payload.category
      : null;

  return {
    category,
    count,
    name: payload.name?.trim() ?? "",
    picUrl: payload.pic_url?.trim() ?? "",
    price,
    timeStamp: payload.timeStamp?.trim() ?? "",
  };
}

function validateCosmeticValues({
  category,
  count,
  name,
  picUrl,
  price,
  timeStamp,
}: ReturnType<typeof parseCosmeticValues>) {
  if (!name) {
    return "请输入化妆品名称";
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return "请选择日期";
  }

  if (category === null || !supportedCosmeticCategories.includes(category)) {
    return "请选择化妆品分类";
  }

  if (price === null || price < 0) {
    return "请输入有效价格";
  }

  if (count !== null && count < 1) {
    return "请输入有效数量";
  }

  if (!picUrl) {
    return "请上传化妆品图片";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parseCosmeticValues(
    (await request.json()) as CosmeticCreatePayload,
  );
  const validationMessage = validateCosmeticValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(
    supabase,
    "cosmetic",
    session.user.id,
    {
      c_id: randomUUID(),
      category: values.category ?? supportedCosmeticCategories[0],
      count: values.count ?? 1,
      name: values.name,
      pic_url: values.picUrl,
      price: values.price ?? 0,
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

  const payload = (await request.json()) as CosmeticUpdatePayload;
  const cosmeticId = getCosmeticId(payload);
  const values = parseCosmeticValues(payload);
  const validationMessage = validateCosmeticValues(values);

  if (!cosmeticId) {
    return NextResponse.json({ message: "缺少化妆品标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await updateItem(
    supabase,
    "cosmetic",
    session.user.id,
    cosmeticId,
    {
      category: values.category ?? supportedCosmeticCategories[0],
      count: values.count ?? 1,
      name: values.name,
      pic_url: values.picUrl,
      price: values.price ?? 0,
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

  const payload = (await request.json()) as CosmeticDeletePayload;
  const cosmeticId = getCosmeticId(payload);

  if (!cosmeticId) {
    return NextResponse.json({ message: "缺少化妆品标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentCosmetic, error: currentCosmeticError } =
    await getItemPicture(supabase, "cosmetic", session.user.id, cosmeticId);

  if (currentCosmeticError) {
    return NextResponse.json(
      { message: currentCosmeticError.message },
      { status: 500 },
    );
  }

  if (!currentCosmetic) {
    return NextResponse.json({ message: "化妆品不存在" }, { status: 404 });
  }

  try {
    await deleteOwnOssObject(currentCosmetic.pic_url, session.user.id, [
      "cosmetic",
    ]);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除图片失败" },
      { status: 500 },
    );
  }

  const { error } = await deleteItem(
    supabase,
    "cosmetic",
    session.user.id,
    cosmeticId,
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
