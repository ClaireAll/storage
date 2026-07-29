import { randomUUID } from "crypto";
import { blogCategoryOptions } from "@/app/(pages)/home/constant";
import { createItem, deleteItem, updateItem } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type BlogCreatePayload = {
  category?: number;
  name?: string;
  url?: string;
};

type BlogUpdatePayload = BlogCreatePayload & {
  b_id?: string | number;
  c_id?: string | number;
};

type BlogDeletePayload = {
  b_id?: string | number;
  c_id?: string | number;
};

const supportedBlogCategories = blogCategoryOptions.map(({ value }) => value);

function getBlogId(payload: BlogUpdatePayload | BlogDeletePayload) {
  return typeof payload.b_id === "number" || typeof payload.b_id === "string"
    ? String(payload.b_id).trim()
    : typeof payload.c_id === "number" || typeof payload.c_id === "string"
      ? String(payload.c_id).trim()
      : "";
}

function normalizeBlogUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function parseBlogValues(payload: BlogCreatePayload) {
  const category =
    typeof payload.category === "number" && Number.isInteger(payload.category)
      ? payload.category
      : null;
  const url = payload.url?.trim() ?? "";

  return {
    category,
    name: payload.name?.trim() ?? "",
    url: url ? normalizeBlogUrl(url) : "",
  };
}

function validateBlogValues({
  category,
  name,
  url,
}: ReturnType<typeof parseBlogValues>) {
  if (!name) {
    return "请输入笔记名称";
  }

  if (category === null || !supportedBlogCategories.includes(category)) {
    return "请选择笔记分类";
  }

  try {
    new URL(url);
  } catch {
    return "请输入有效链接";
  }

  return "";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const values = parseBlogValues((await request.json()) as BlogCreatePayload);
  const validationMessage = validateBlogValues(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await createItem(supabase, "blog", session.user.id, {
    b_id: randomUUID(),
    category: values.category ?? supportedBlogCategories[0],
    name: values.name,
    url: values.url,
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

  const payload = (await request.json()) as BlogUpdatePayload;
  const blogId = getBlogId(payload);
  const values = parseBlogValues(payload);
  const validationMessage = validateBlogValues(values);

  if (!blogId) {
    return NextResponse.json({ message: "缺少笔记标识" }, { status: 400 });
  }

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await updateItem(
    supabase,
    "blog",
    session.user.id,
    blogId,
    {
      category: values.category ?? supportedBlogCategories[0],
      name: values.name,
      url: values.url,
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

  const payload = (await request.json()) as BlogDeletePayload;
  const blogId = getBlogId(payload);

  if (!blogId) {
    return NextResponse.json({ message: "缺少笔记标识" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await deleteItem(supabase, "blog", session.user.id, blogId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
