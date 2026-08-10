import { GitHubReadmePreview } from "../github-readme-preview";
import { renderHomePage } from "../page";

/** Codex Plugin 节点展示 Chrome Plugin 仓库 README。 */
export default async function CodexPluginPage() {
  return renderHomePage({
    activeCategoryHref: "/home/codex-plugin",
    loadContent: async () => ({
      content: (
        <GitHubReadmePreview
          iconClassName="icon-plugin"
          repository="ClaireAll/chrome-plugin"
          title="Plugin"
        />
      ),
      itemCount: 0,
    }),
  });
}
