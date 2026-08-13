import { searchInvestmentInstruments } from "@/app/(pages)/home/investment/investment-data";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

/** 通过公开数据源按代码或名称搜索可添加的基金及深市 00 股票。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const keyword = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json(await searchInvestmentInstruments(keyword));
}
