import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { generateWanxiangOutfitImage } from "../wanxiang";

function normalizeImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter((url) => /^https?:\/\//i.test(url));
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    imageUrls?: unknown;
    prompt?: unknown;
  } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json({ message: "请输入搭配图片提示词" }, { status: 400 });
  }

  try {
    const result = await generateWanxiangOutfitImage({
      imageUrls: normalizeImageUrls(body?.imageUrls),
      prompt,
      userId: session.user.id,
    });

    return NextResponse.json({
      images: result.imageUrls,
      model: result.model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "生成搭配效果图失败",
      },
      { status: 500 },
    );
  }
}
