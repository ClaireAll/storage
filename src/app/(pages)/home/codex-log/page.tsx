import { CodexLogDashboard } from "./codex-log-dashboard";
import { listCodexLogDashboard } from "./codex-log-utils";
import { renderHomePage } from "../page";

type CodexLogPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

/** Codex 日报页，按日期读取当天会话记录并渲染分析仪表板。 */
export default async function CodexLogPage({
  searchParams,
}: CodexLogPageProps) {
  const params = await searchParams;

  return renderHomePage({
    activeCategoryHref: "/home/codex-log",
    loadContent: async ({ supabase, userId }) => {
      const dashboardData = await listCodexLogDashboard(
        supabase,
        userId,
        params?.date,
      );

      return {
        content: <CodexLogDashboard data={dashboardData} />,
        itemCount: dashboardData.stats.taskCount,
      };
    },
  });
}
