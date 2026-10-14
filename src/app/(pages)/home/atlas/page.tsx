import { renderHomePage } from "../page";
import { AtlasWorkspace } from "./atlas-workspace";

/** 将知识星图接入现有主页与登录流程。 */
export default async function AtlasPage() {
  return renderHomePage({
    activeCategoryHref: "/home/atlas",
    loadContent: async () => ({ content: <AtlasWorkspace /> }),
  });
}
