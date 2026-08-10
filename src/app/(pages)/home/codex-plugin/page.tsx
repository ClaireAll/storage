import { CodexSectionPlaceholder } from "../codex-section-placeholder";
import { renderHomePage } from "../page";

/** Codex Plugin 节点，当前先保留为信息占位页。 */
export default async function CodexPluginPage() {
  return renderHomePage({
    activeCategoryHref: "/home/codex-plugin",
    loadContent: async () => ({
      content: (
        <CodexSectionPlaceholder
          description="暂无 Plugin 数据"
          iconClassName="icon-plugin"
          title="Plugin"
        />
      ),
      itemCount: 0,
    }),
  });
}
