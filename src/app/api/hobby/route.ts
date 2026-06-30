import { randomUUID } from "crypto";
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

type HobbyCreatePayload = {
  category?: number;
  name?: string;
  pic_url?: string;
  price?: number;
  timeStamp?: string;
};

type HobbyUpdatePayload = HobbyCreatePayload & {
  c_id?: string | number;
  h_id?: string | number;
};

type HobbyDeletePayload = {
  c_id?: string | number;
  h_id?: string | number;
};

const supportedHobbyCategories = [1, 2, 3];

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getHobbyId(payload: HobbyUpdatePayload | HobbyDeletePayload) {
  return typeof payload.h_id === "number" || typeof payload.h_id === "string"
    ? String(payload.h_id).trim()
    : typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
}

function parseHobbyValues(payload: HobbyCreatePayload) {
  const price =
    typeof payload.price === "number" && Number.isFinite(payload.price)
      ? Number(payload.price.toFixed(2))
      : null;
  const category =
    typeof payload.category === "number" && Number.isInteger(payload.category)
      ? payload.category
      : null;

  return {
    category,
    name: payload.name?.trim() ?? "",
    picUrl: payload.pic_url?.trim() ?? "",
    price,
    timeStamp: payload.timeStamp?.trim() ?? "",
  };
}

function validateHobbyValues({
  category,
  name,
  picUrl,
  price,
  timeStamp,
}: ReturnType<typeof parseHobbyValues>) {
  if (!name) {
    return "请输入爱好名称";
  }

  if (!timeStamp || !isDateString(timeStamp)) {
    return "请选择日期";
  }

  if (category === null || !supportedHobbyCategories.includes(category)) {
    return "请选择爱好分类";
  }

  if (!picUrl) {
    return "请上传爱好图片";
  }

  if (price === null || price < 0) {
    return "请输入有效价格";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parseHobbyValues((await request.json()) as HobbyCreatePayload);
  const validationMessage = validateHobbyValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(supabase, "hobby", session.user.id, {
    category: values.category ?? supportedHobbyCategories[0],
    h_id: randomUUID(),
    name: values.name,
    pic_url: values.picUrl,
    price: values.price ?? 0,
    timeStamp: values.timeStamp,
  });

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

  const payload = (await request.json()) as HobbyUpdatePayload;
  const hobbyId = getHobbyId(payload);
  const values = parseHobbyValues(payload);
  const validationMessage = validateHobbyValues(values);

  if (!hobbyId) {
    return NextResponse.json({ message: "缺少爱好标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await updateItem(
    supabase,
    "hobby",
    session.user.id,
    hobbyId,
    {
      category: values.category ?? supportedHobbyCategories[0],
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

  const payload = (await request.json()) as HobbyDeletePayload;
  const hobbyId = getHobbyId(payload);

  if (!hobbyId) {
    return NextResponse.json({ message: "缺少爱好标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentHobby, error: currentHobbyError } =
    await getItemPicture(supabase, "hobby", session.user.id, hobbyId);

  if (currentHobbyError) {
    return NextResponse.json(
      { message: currentHobbyError.message },
      { status: 500 },
    );
  }

  if (!currentHobby) {
    return NextResponse.json({ message: "爱好不存在" }, { status: 404 });
  }

  try {
    if (currentHobby.pic_url) {
      await deleteOwnOssObject(currentHobby.pic_url, session.user.id, [
        "hobby",
      ]);
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除图片失败" },
      { status: 500 },
    );
  }

  const { error } = await deleteItem(
    supabase,
    "hobby",
    session.user.id,
    hobbyId,
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
