import type { InvestmentInstrumentType } from "@/app/utils/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";

type InvestmentPayload = {
  id?: string;
  instrument_code?: string;
  instrument_name?: string;
  instrument_order?: string;
  instrument_type?: InvestmentInstrumentType;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseInstrument(payload: InvestmentPayload) {
  const instrumentCode = payload.instrument_code?.trim() ?? "";
  const instrumentName = payload.instrument_name?.trim() ?? "";
  const instrumentType = payload.instrument_type;

  if (!instrumentName || !instrumentCode) {
    return { error: "请输入有效的代码和名称" };
  }

  if (instrumentType !== "fund" && instrumentType !== "stock") {
    return { error: "请选择基金或股票" };
  }

  if (instrumentType === "stock" && !/^00\d{4}$/.test(instrumentCode)) {
    return { error: "仅支持 00 开头的深市股票" };
  }

  if (instrumentType === "fund" && !/^\d{6}$/.test(instrumentCode)) {
    return { error: "基金代码应为 6 位数字" };
  }

  return { instrumentCode, instrumentName, instrumentType };
}

/** 新增当前用户的基金或 00 开头股票关注项。 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) return jsonError("请先登录", 401);

  const parsed = parseInstrument((await request.json()) as InvestmentPayload);

  if (typeof parsed.error === "string") return jsonError(parsed.error, 400);

  const supabase = createAdminClient();
  const { data: existingItem, error: existingError } = await supabase
    .from("investment")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("instrument_code", parsed.instrumentCode)
    .eq("instrument_type", parsed.instrumentType)
    .maybeSingle();

  if (existingError) return jsonError(existingError.message, 500);
  if (existingItem) return jsonError("该项目已在我的关注中", 409);

  const { data, error } = await supabase
    .from("investment")
    .insert({
      instrument_code: parsed.instrumentCode,
      instrument_name: parsed.instrumentName,
      instrument_type: parsed.instrumentType,
      user_id: session.user.id,
    })
    .select("id,instrument_code,instrument_name,instrument_type,created_at,instrument_order")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(data);
}

/** 保存当前用户关注项的共享代码排序数组。 */
export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) return jsonError("请先登录", 401);

  const payload = (await request.json()) as InvestmentPayload;
  const order = payload.instrument_order?.trim();

  if (!order) return jsonError("缺少排序数据", 400);

  try {
    const parsed = JSON.parse(order);
    if (!Array.isArray(parsed) || parsed.some((code) => typeof code !== "string")) {
      return jsonError("排序数据格式无效", 400);
    }
  } catch {
    return jsonError("排序数据格式无效", 400);
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("investment")
    .update({ instrument_order: order })
    .eq("user_id", session.user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

/** 删除当前用户的单条关注项。 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) return jsonError("请先登录", 401);

  const id = ((await request.json()) as InvestmentPayload).id?.trim();

  if (!id) return jsonError("缺少关注项标识", 400);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("investment")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}
