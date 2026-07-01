import { randomUUID } from "crypto";
import { skincareCategoryOptions } from "@/app/(pages)/home/constant";
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

type SkincareCreatePayload = {
  category?: number;
  count?: number;
  name?: string;
  pic_url?: string;
  price?: number;
  timeStamp?: string;
};

type SkincareUpdatePayload = SkincareCreatePayload & {
  c_id?: string | number;
  s_id?: string | number;
};

type SkincareDeletePayload = {
  c_id?: string | number;
  s_id?: string | number;
};

const supportedSkincareCategories = skincareCategoryOptions.map(
  ({ value }) => value,
);

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getSkincareId(payload: SkincareUpdatePayload | SkincareDeletePayload) {
  return typeof payload.s_id === "number" || typeof payload.s_id === "string"
    ? String(payload.s_id).trim()
    : typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
}

function parseSkincareValues(payload: SkincareCreatePayload) {
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

function validateSkincareValues({
  category,
  count,
  name,
  picUrl,
  price,
  timeStamp,
}: ReturnType<typeof parseSkincareValues>) {
  if (!name) {
    return "请输入护肤品名称";
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return "请选择日期";
  }

  if (category === null || !supportedSkincareCategories.includes(category)) {
    return "请选择护肤品分类";
  }

  if (price === null || price < 0) {
    return "请输入有效价格";
  }

  if (count !== null && count < 1) {
    return "请输入有效数量";
  }

  if (!picUrl) {
    return "请上传护肤品图片";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parseSkincareValues(
    (await request.json()) as SkincareCreatePayload,
  );
  const validationMessage = validateSkincareValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(
    supabase,
    "skincare",
    session.user.id,
    {
      s_id: randomUUID(),
      category: values.category ?? supportedSkincareCategories[0],
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

  const payload = (await request.json()) as SkincareUpdatePayload;
  const skincareId = getSkincareId(payload);
  const values = parseSkincareValues(payload);
  const validationMessage = validateSkincareValues(values);

  if (!skincareId) {
    return NextResponse.json({ message: "缺少护肤品标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await updateItem(
    supabase,
    "skincare",
    session.user.id,
    skincareId,
    {
      category: values.category ?? supportedSkincareCategories[0],
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

  const payload = (await request.json()) as SkincareDeletePayload;
  const skincareId = getSkincareId(payload);

  if (!skincareId) {
    return NextResponse.json({ message: "缺少护肤品标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentSkincare, error: currentSkincareError } =
    await getItemPicture(supabase, "skincare", session.user.id, skincareId);

  if (currentSkincareError) {
    return NextResponse.json(
      { message: currentSkincareError.message },
      { status: 500 },
    );
  }

  if (!currentSkincare) {
    return NextResponse.json({ message: "护肤品不存在" }, { status: 404 });
  }

  try {
    await deleteOwnOssObject(currentSkincare.pic_url, session.user.id, [
      "skincare",
    ]);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除图片失败" },
      { status: 500 },
    );
  }

  const { error } = await deleteItem(
    supabase,
    "skincare",
    session.user.id,
    skincareId,
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
