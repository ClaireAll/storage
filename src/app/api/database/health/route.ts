import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/app/database/config";
import { getSqlClient } from "@/app/database/client";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        message: "数据库连接信息未配置完整",
      },
      { status: 500 },
    );
  }

  try {
    const sql = getSqlClient();
    const [result] = await sql<{ now: Date }[]>`select now()`;

    return NextResponse.json({
      connected: true,
      now: result.now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "数据库连接失败",
      },
      { status: 500 },
    );
  }
}
