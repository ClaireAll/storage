import { CodexSectionPlaceholder } from "../codex-section-placeholder";
import { renderHomePage } from "../page";

/** Codex Skills 节点，当前先保留为信息占位页。 */
export default async function CodexSkillsPage() {
  return renderHomePage({
    activeCategoryHref: "/home/codex-skills",
    loadContent: async () => ({
      content: (
        <CodexSectionPlaceholder
          description="暂无 Skills 数据"
          iconClassName="icon-skills"
          title="Skills"
        />
      ),
      itemCount: 0,
    }),
  });
}
