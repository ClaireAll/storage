import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import type { InvestmentRecommendation, InvestmentSectorSignal } from "./investment-types";

type InvestmentNotificationRow = {
  enabled: boolean;
  last_recommendation_key: string | null;
  last_signal_key: string | null;
  notify_on_recommendation: boolean;
  notify_on_signal: boolean;
  webhook_url: string;
};

/** 按同一交易日和信号内容去重后，向用户自己配置的企微机器人发送提醒。 */
export async function dispatchInvestmentNotifications(
  userId: string,
  recommendations: InvestmentRecommendation[],
  sectors: InvestmentSectorSignal[],
) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("investment_notifications")
      .select("enabled,webhook_url,notify_on_recommendation,notify_on_signal,last_recommendation_key,last_signal_key")
      .eq("user_id", userId)
      .maybeSingle<InvestmentNotificationRow>();
    if (error || !data?.enabled) return;

    const dateKey = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    const recommendationKey = `${dateKey}:${recommendations.map((item) => `${item.instrumentCode}:${item.forecast}`).join("|")}`;
    const signalItems = sectors.filter((item) => item.direction !== "震荡" && item.changePercent !== null);
    const signalKey = `${dateKey}:${signalItems.map((item) => `${item.name}:${item.direction}`).join("|")}`;
    const updates: Record<string, string> = {};

    if (data.notify_on_recommendation && data.last_recommendation_key !== recommendationKey) {
      const content = recommendations
        .map((item) => `- ${item.instrumentName}（${item.instrumentCode}）：${item.forecast}`)
        .join("\n");
      const delivered = await sendWeComMessage(data.webhook_url, `**投资关注候选**\n${content}\n\n规则模型整理，仅供参考。`);
      if (delivered) updates.last_recommendation_key = recommendationKey;
    }

    if (signalItems.length && data.notify_on_signal && data.last_signal_key !== signalKey) {
      const content = signalItems
        .map((item) => `- ${item.name}：${item.direction} ${item.forecastPercent === undefined ? "" : formatPercent(item.forecastPercent)}`)
        .join("\n");
      const delivered = await sendWeComMessage(data.webhook_url, `**市场信号地图**\n${content}\n\n规则模型整理，仅供参考。`);
      if (delivered) updates.last_signal_key = signalKey;
    }

    if (Object.keys(updates).length) {
      await supabase
        .from("investment_notifications")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
  } catch {
    // 推送失败不影响仪表盘行情刷新；下次刷新会重试未确认的信号。
  }
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

async function sendWeComMessage(webhookUrl: string, content: string) {
  try {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify({ markdown: { content }, msgtype: "markdown" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
