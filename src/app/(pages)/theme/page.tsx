import { ThemeSettingsPage } from "./theme-settings-page";
import {
  getThemeConfigFromRow,
  isThemeConfig,
  isThemeMode,
  themeConfigCacheKey,
} from "@/app/(pages)/theme/constants";
import type { ThemeConfig } from "@/app/(pages)/theme/types";
import { getThemeRow } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { auth } from "../../../../auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThemePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cachedThemeConfig = getCachedThemeConfig(
    cookieStore.get(themeConfigCacheKey)?.value,
  );
  const themeModeCookie = cookieStore.get("storage-theme-mode")?.value ?? "";
  const themeMode = isThemeMode(themeModeCookie) ? themeModeCookie : undefined;
  const themeConfig =
    cachedThemeConfig ??
    (await getDatabaseThemeConfig(session.user.id, themeMode));

  return (
    <ThemeSettingsPage
      initialTheme={{
        ...themeConfig,
        mode: themeMode ?? themeConfig.mode,
      }}
    />
  );
}

/** 解析浏览器缓存中的主题配置，参数 value 为 cookie 中保存的主题 JSON 字符串。 */
function getCachedThemeConfig(value?: string): ThemeConfig | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;

    return isThemeConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** 从数据库读取主题配置，参数 userId 为当前登录用户 id，mode 为 cookie 中保存的显示模式。 */
async function getDatabaseThemeConfig(
  userId: string,
  mode: ThemeConfig["mode"] | undefined,
) {
  const supabase = await createClient();
  const { data } = await getThemeRow(supabase, userId);

  return getThemeConfigFromRow(data, mode);
}
