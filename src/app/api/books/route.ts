import { randomUUID } from "crypto";
import {
  createItem,
  deleteItem,
  getItemAssets,
  updateItem,
} from "@/app/utils/database";
import { deleteOwnOssObject } from "@/utils/oss-server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type BookCreatePayload = {
  category?: number;
  download_url?: string;
  name?: string;
  pic_url?: string;
  price?: number;
};

type BookUpdatePayload = BookCreatePayload & {
  b_id?: string | number;
  c_id?: string | number;
};

type BookDeletePayload = {
  b_id?: string | number;
  c_id?: string | number;
};

const supportedBookCategories = [1, 2];

function getBookId(payload: BookUpdatePayload | BookDeletePayload) {
  return typeof payload.b_id === "number" || typeof payload.b_id === "string"
    ? String(payload.b_id).trim()
    : typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
}

function parseBookValues(payload: BookCreatePayload) {
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
    downloadUrl: payload.download_url?.trim() ?? "",
    name: payload.name?.trim() ?? "",
    picUrl: payload.pic_url?.trim() ?? "",
    price,
  };
}

function validateBookValues({
  category,
  name,
  price,
}: ReturnType<typeof parseBookValues>) {
  if (!name) {
    return "请输入图书名称";
  }

  if (price === null || price < 0) {
    return "请输入有效价格";
  }

  if (category === null || !supportedBookCategories.includes(category)) {
    return "请选择图书分类";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parseBookValues((await request.json()) as BookCreatePayload);
  const validationMessage = validateBookValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(supabase, "books", session.user.id, {
    b_id: randomUUID(),
    category: values.category ?? supportedBookCategories[0],
    download_url: values.downloadUrl,
    name: values.name,
    pic_url: values.picUrl,
    price: values.price ?? 0,
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

  const payload = (await request.json()) as BookUpdatePayload;
  const bookId = getBookId(payload);
  const values = parseBookValues(payload);
  const validationMessage = validateBookValues(values);

  if (!bookId) {
    return NextResponse.json({ message: "缺少图书标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentBook, error: currentBookError } =
    await getItemAssets(supabase, "books", session.user.id, bookId);

  if (currentBookError) {
    return NextResponse.json(
      { message: currentBookError.message },
      { status: 500 },
    );
  }

  if (!currentBook) {
    return NextResponse.json({ message: "图书不存在" }, { status: 404 });
  }

  const { data, error } = await updateItem(
    supabase,
    "books",
    session.user.id,
    bookId,
    {
      category: values.category ?? supportedBookCategories[0],
      download_url: values.downloadUrl,
      name: values.name,
      pic_url: values.picUrl,
      price: values.price ?? 0,
    },
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (
    currentBook.download_url &&
    values.downloadUrl &&
    currentBook.download_url !== values.downloadUrl
  ) {
    try {
      await deleteOwnOssObject(currentBook.download_url, session.user.id, [
        "books",
      ]);
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "删除原下载文件失败",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const payload = (await request.json()) as BookDeletePayload;
  const bookId = getBookId(payload);

  if (!bookId) {
    return NextResponse.json({ message: "缺少图书标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: currentBook, error: currentBookError } =
    await getItemAssets(supabase, "books", session.user.id, bookId);

  if (currentBookError) {
    return NextResponse.json(
      { message: currentBookError.message },
      { status: 500 },
    );
  }

  if (!currentBook) {
    return NextResponse.json({ message: "图书不存在" }, { status: 404 });
  }

  try {
    if (currentBook.pic_url) {
      await deleteOwnOssObject(currentBook.pic_url, session.user.id, ["books"]);
    }
    if (currentBook.download_url) {
      await deleteOwnOssObject(currentBook.download_url, session.user.id, [
        "books",
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
    "books",
    session.user.id,
    bookId,
  );

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
