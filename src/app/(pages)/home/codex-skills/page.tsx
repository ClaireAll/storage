import { GitHubReadmePreview } from "../github-readme-preview";
import { renderHomePage } from "../page";

/** Codex Skills 节点展示 Skills 仓库 README。 */
export default async function CodexSkillsPage() {
  return renderHomePage({
    activeCategoryHref: "/home/codex-skills",
    loadContent: async () => ({
      content: (
        <GitHubReadmePreview
          iconClassName="icon-skills"
          repository="ClaireAll/skills"
          title="Skills"
        />
      ),
      itemCount: 0,
    }),
  });
}
