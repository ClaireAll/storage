import { NextResponse } from "next/server";
import { listUsers } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";

/** 查询 Supabase users 表，并将结果返回给前端。 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await listUsers(supabase);

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
