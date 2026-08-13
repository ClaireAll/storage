import { renderHomePage } from "../page";
import { InvestmentDashboard } from "./investment-dashboard";
import { listInvestmentDashboard } from "./investment-data";
import { createAdminClient } from "@/utils/supabase/admin";

/** 投资工作台页面，读取当前用户手动维护的关注项。 */
export default async function InvestmentPage() {
  return renderHomePage({
    activeCategoryHref: "/home/investment",
    loadContent: async ({ userId }) => {
      const dashboardData = await listInvestmentDashboard(createAdminClient(), userId);

      return {
        content: <InvestmentDashboard initialData={dashboardData} />,
        itemCount: dashboardData.watchlist.length,
      };
    },
  });
}
