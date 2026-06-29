import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByPhone } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";

/** 注册接口接收的请求体结构。 */
type RegisterPayload = {
  /** 用户姓名，注册时必填。 */
  name?: string;
  /** 登录密码，注册时必填，最少 4 位。 */
  password?: string;
  /** 用户手机号，作为登录账号。 */
  phone?: string;
};

/** 处理用户注册请求，校验字段后写入 Supabase users 表。 */
export async function POST(request: Request) {
  const payload = (await request.json()) as RegisterPayload;
  const name = payload.name?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  const password = payload.password ?? "";

  if (!name || !phone || password.length < 4) {
    return NextResponse.json(
      {
        message: "请填写姓名、手机号和至少 4 位密码",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: existingUser, error: lookupError } = await getUserByPhone(
    supabase,
    phone,
  );

  if (lookupError) {
    return NextResponse.json(
      {
        message: lookupError.message,
      },
      { status: 500 },
    );
  }

  if (existingUser) {
    return NextResponse.json(
      {
        message: "该手机号已注册",
      },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const { data, error } = await createUser(supabase, {
    name,
    password: hashedPassword,
    phone,
  });

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
