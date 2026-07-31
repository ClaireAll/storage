import { isThemeConfig } from "@/app/(pages)/theme/constants";
import type { HobbyShareResolution } from "@/app/api/share/hobby/share-types";
import { normalizeHobbyShareResolution } from "@/app/api/share/hobby/share-utils";
import { resolveHobbyShare } from "@/app/utils/database";
import { createClient } from "@/utils/supabase/server";
import { HobbyShareView } from "./hobby-share-view";

/** 公开爱好分享页路由参数。 */
type HobbySharePageProps = {
  params: Promise<{ token: string }>;
};

/** 公开爱好分享页，首次请求直接解析无需密码的快照。 */
export default async function HobbySharePage({
  params,
}: HobbySharePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const result = await resolveHobbyShare(supabase, token);
  const initialResolution = normalizeHobbyShareResolution(
    result.data ??
      ({
        expiresAt: null,
        slides: [],
        status: result.error ? "error" : "not_found",
        theme: null,
      } satisfies HobbyShareResolution),
    isThemeConfig,
  );

  return (
    <HobbyShareView
      initialResolution={initialResolution}
      token={token}
    />
  );
}
