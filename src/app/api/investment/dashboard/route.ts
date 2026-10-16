import { listInvestmentDashboard, listInvestmentQuoteSnapshot } from "@/app/(pages)/home/investment/investment-data";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

/** 刷新当前用户的投资工作台行情和状态。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  try {
    const load = new URL(request.url).searchParams.get("mode") === "quotes" ? listInvestmentQuoteSnapshot : listInvestmentDashboard;
    return NextResponse.json(await load(createAdminClient(), session.user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ message: "行情读取失败，请稍后重试" }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
