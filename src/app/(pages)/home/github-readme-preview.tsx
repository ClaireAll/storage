import { GitHubReadmePreviewContent } from "./github-readme-preview-content";

type GitHubReadmePreviewProps = {
  iconClassName: string;
  repository: string;
  title: string;
};

const githubOrigin = "https://github.com";

function getRepositoryUrl(repository: string) {
  return `${githubOrigin}/${repository}`;
}

function getReadmeUrl(repository: string) {
  return `${getRepositoryUrl(repository)}/blob/main/README.md`;
}

function normalizeReadmeLinks(html: string, repository: string) {
  const readmeUrl = getReadmeUrl(repository);

  return html.replace(
    /(<a\b[^>]*\bhref=)(["'])([^"']+)\2/gi,
    (match, prefix: string, quote: string, href: string) => {
      if (href.startsWith("#") || /^[a-z][a-z\d+.-]*:/i.test(href)) {
        return match;
      }

      return `${prefix}${quote}${new URL(href, readmeUrl).href}${quote}`;
    },
  );
}

async function loadGitHubReadme(repository: string) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.html+json",
          "User-Agent": "Claire-Storage-README-Preview",
        },
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      return null;
    }

    return normalizeReadmeLinks(await response.text(), repository);
  } catch {
    return null;
  }
}

export async function GitHubReadmePreview({
  iconClassName,
  repository,
  title,
}: GitHubReadmePreviewProps) {
  const readmeHtml = await loadGitHubReadme(repository);

  return (
    <GitHubReadmePreviewContent
      iconClassName={iconClassName}
      readmeHtml={readmeHtml}
      readmeUrl={getReadmeUrl(repository)}
      repository={repository}
      title={title}
    />
  );
}
