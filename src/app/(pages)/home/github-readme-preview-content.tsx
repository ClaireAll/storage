"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { LinkOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { HomeContentFullscreenButton } from "./home-content-fullscreen";

type GitHubReadmePreviewContentProps = {
  iconClassName: string;
  readmeHtml: string | null;
  readmeUrl: string;
  repository: string;
  title: string;
};

export function GitHubReadmePreviewContent({
  iconClassName,
  readmeHtml,
  readmeUrl,
  repository,
  title,
}: GitHubReadmePreviewContentProps) {
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--home-preview-divider-color)] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--home-preview-border-color)] bg-[color-mix(in_srgb,var(--home-theme-color)_12%,transparent)]">
            <CategoryIcon
              className="size-5"
              iconClassName="size-5"
              mode="symbol"
              name={iconClassName}
            />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Typography.Title className="!mb-0 !text-base" level={5}>
                {title}
              </Typography.Title>
              <HomeContentFullscreenButton />
            </div>
            <Typography.Text className="block truncate text-xs" type="secondary">
              {repository}
            </Typography.Text>
          </div>
        </div>
        <Button
          href={readmeUrl}
          icon={<LinkOutlined />}
          rel="noreferrer"
          size="small"
          target="_blank"
        >
          GitHub
        </Button>
      </header>

      {readmeHtml ? (
        <OverlayScrollArea
          className="min-h-0 flex-1"
          horizontal
          viewportClassName="pr-1"
        >
          <article
            className="github-readme-preview-markdown min-w-0 pb-5 text-sm leading-7 text-(--home-theme-text) [&_.anchor]:hidden [&_a]:wrap-break-word [&_a]:text-(--home-theme-color) [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--home-preview-border-soft-color)] [&_blockquote]:bg-[color-mix(in_srgb,var(--home-theme-color)_7%,transparent)] [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-[color-mix(in_srgb,var(--home-theme-text)_10%,transparent)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_h1]:mb-5 [&_h1]:mt-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-[color:var(--home-preview-divider-color)] [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[color:var(--home-preview-divider-color)] [&_li]:my-1 [&_markdown-accessiblity-table]:block [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:rounded-md [&_pre]:border [&_pre]:border-[color:var(--home-preview-border-soft-color)] [&_pre]:bg-[color-mix(in_srgb,var(--home-theme-bg)_86%,#000000_14%)] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:block [&_table]:border-collapse [&_table]:whitespace-nowrap [&_td]:border [&_td]:border-[color:var(--home-preview-divider-color)] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[color:var(--home-preview-divider-color)] [&_th]:bg-[color-mix(in_srgb,var(--home-theme-color)_10%,transparent)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
          />
        </OverlayScrollArea>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
          <CategoryIcon
            className="size-10 opacity-70"
            iconClassName="size-9"
            mode="symbol"
            name={iconClassName}
          />
          <div>
            <Typography.Text className="block" strong>
              README 暂时无法加载
            </Typography.Text>
            <Typography.Text type="secondary">
              可以前往 GitHub 查看原始文档。
            </Typography.Text>
          </div>
          <Button
            href={readmeUrl}
            icon={<LinkOutlined />}
            rel="noreferrer"
            size="small"
            target="_blank"
          >
            打开 README
          </Button>
        </div>
      )}
    </section>
  );
}
