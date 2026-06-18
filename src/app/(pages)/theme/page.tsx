import { ThemeSettingsPage } from "./theme-settings-page";
import {
  getThemeConfigFromRow,
  isThemeMode,
} from "@/app/(pages)/theme/constants";
import type { ThemeDatabaseRow } from "@/app/(pages)/theme/types";
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

  const supabase = await createClient();
  const { data } = await supabase
    .from("theme")
    .select(
      "id,theme,texture,light_theme_color,light_theme_bg,light_theme_text,dark_theme_color,dark_theme_bg,dark_theme_text",
    )
    .eq("id", session.user.id)
    .maybeSingle<ThemeDatabaseRow>();
  const cookieStore = await cookies();
  const themeModeCookie = cookieStore.get("storage-theme-mode")?.value ?? "";
  const themeMode = isThemeMode(themeModeCookie) ? themeModeCookie : undefined;

  return <ThemeSettingsPage initialTheme={getThemeConfigFromRow(data, themeMode)} />;
}
