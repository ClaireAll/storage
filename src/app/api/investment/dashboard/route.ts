import { listInvestmentDashboard } from "@/app/(pages)/home/investment/investment-data";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

/** 刷新当前用户的投资工作台行情和状态。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  return NextResponse.json(await listInvestmentDashboard(createAdminClient(), session.user.id));
}
