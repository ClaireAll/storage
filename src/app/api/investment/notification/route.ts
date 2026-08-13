import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";

type NotificationPayload = {
  enabled?: boolean;
  notify_on_recommendation?: boolean;
  notify_on_signal?: boolean;
  webhook_url?: string;
};

function isValidWebhookUrl(value: string) {
  return /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(value);
}

/** 读取当前用户的企微机器人通知配置，不把 webhook 回传给浏览器。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investment_notifications")
    .select("enabled,notify_on_recommendation,notify_on_signal,updated_at,webhook_url")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ? {
    enabled: data.enabled,
    has_webhook: Boolean(data.webhook_url),
    notify_on_recommendation: data.notify_on_recommendation,
    notify_on_signal: data.notify_on_signal,
    updated_at: data.updated_at,
  } : null);
}

/** 保存当前用户自己提供的企微机器人 webhook 与推送条件。 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "请先登录" }, { status: 401 });

  const payload = (await request.json()) as NotificationPayload;
  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from("investment_notifications")
    .select("webhook_url")
    .eq("user_id", session.user.id)
    .maybeSingle<{ webhook_url: string }>();
  if (readError) return NextResponse.json({ message: readError.message }, { status: 500 });

  const webhookUrl = payload.webhook_url?.trim() || current?.webhook_url || "";
  if (!isValidWebhookUrl(webhookUrl)) {
    return NextResponse.json({ message: "请输入有效的企微机器人 Webhook 链接" }, { status: 400 });
  }

  const { error } = await supabase
    .from("investment_notifications")
    .upsert({
      enabled: Boolean(payload.enabled),
      notify_on_recommendation: Boolean(payload.notify_on_recommendation),
      notify_on_signal: Boolean(payload.notify_on_signal),
      updated_at: new Date().toISOString(),
      user_id: session.user.id,
      webhook_url: webhookUrl,
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
