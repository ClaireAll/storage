"use client";

import { CategoryIcon } from "@/app/(pages)/common/category-icon";
import { Empty, Typography } from "antd";

type CodexSectionPlaceholderProps = {
  description: string;
  iconClassName: string;
  title: string;
};

export function CodexSectionPlaceholder({
  description,
  iconClassName,
  title,
}: CodexSectionPlaceholderProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--home-theme-color)_24%,transparent)] bg-[color-mix(in_srgb,var(--home-theme-bg)_92%,#ffffff_8%)] p-6">
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <span className="mb-4 inline-flex size-14 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--home-theme-color)_28%,transparent)] bg-[color-mix(in_srgb,var(--home-theme-color)_14%,transparent)]">
          <CategoryIcon
            className="size-9"
            iconClassName="size-8"
            mode="symbol"
            name={iconClassName}
          />
        </span>
        <Typography.Title className="!mb-2 !text-xl" level={4}>
          {title}
        </Typography.Title>
        <Typography.Text className="mb-5 leading-6" type="secondary">
          {description}
        </Typography.Text>
        <Empty
          className="opacity-70"
          description={false}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    </div>
  );
}
