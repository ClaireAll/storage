import { NextResponse } from "next/server";
import { isThemeColor, isThemeMode } from "@/app/theme/constants";
import { writeThemeConfig } from "@/app/theme/env";

export async function POST(request: Request) {
  const payload = await request.json();
  const mode = typeof payload.mode === "string" ? payload.mode : "";
  const color = typeof payload.color === "string" ? payload.color : "";

  if (!isThemeMode(mode) || !isThemeColor(color)) {
    return NextResponse.json(
      { message: "主题配置无效" },
      { status: 400 },
    );
  }

  await writeThemeConfig({ mode, color });

  return NextResponse.json({ mode, color });
}
