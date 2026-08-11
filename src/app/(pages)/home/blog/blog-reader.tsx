"use client";

import { useHomeContentActions } from "@/app/(pages)/home/home-view";
import { cn } from "@/lib/utils";
import {
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Empty, Input, Typography } from "antd";
import { useMemo, useState } from "react";
import type { ClothesItem } from "../clothes/clothes-type";
import { matchClothesNameSearch } from "../clothes/clothes-utils";

type BlogReaderProps = {
  items: ClothesItem[];
};

function renderHighlightedName(name: string, keyword: string) {
  const match = matchClothesNameSearch(name, keyword);

  return Array.from(name).map((char, index) =>
    match.highlightIndexes.has(index) ? (
      <span className="blog-reader-name-highlight" key={`${char}-${index}`}>
        {char}
      </span>
    ) : (
      <span key={`${char}-${index}`}>{char}</span>
    ),
  );
}

function normalizeUrl(url?: string) {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}

export function BlogReader({ items }: BlogReaderProps) {
  const { openClothesCreateModal, openClothesEditModal } =
    useHomeContentActions();
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | undefined>(
    items[0]?.c_id,
  );
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        matchClothesNameSearch(item.name, normalizedKeyword).matched,
      ),
    [items, normalizedKeyword],
  );
  const selectedItem =
    filteredItems.find((item) => item.c_id === selectedId) ??
    filteredItems[0] ??
    null;
  const previewUrl = normalizeUrl(selectedItem?.url);

  function changeKeyword(event: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(event.target.value);
  }

  function finishKeywordComposition(
    event: React.CompositionEvent<HTMLInputElement>,
  ) {
    setKeyword(event.currentTarget.value);
  }

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-[minmax(220px,280px)_minmax(0,1fr)] gap-3.5 max-[900px]:grid-cols-1">
      <aside className="flex min-h-0 min-w-0 flex-col gap-3 max-[900px]:min-h-65">
        <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
          <Input
            allowClear
            className="blog-reader-search h-8"
            onChange={changeKeyword}
            onCompositionEnd={finishKeywordComposition}
            placeholder="搜索笔记名称"
            prefix={<SearchOutlined />}
            value={keyword}
          />
          <Button
            aria-label="新增笔记"
            className="blog-reader-add h-8 w-8 min-w-8 rounded-lg p-0"
            icon={<PlusOutlined />}
            onClick={openClothesCreateModal}
            type="primary"
          />
        </div>
        <div
          className="blog-reader-list min-h-0 flex-1 overflow-auto rounded-lg border"
          role="list"
        >
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <article
                aria-current={selectedItem?.c_id === item.c_id ? "true" : undefined}
                className={cn(
                  "blog-reader-list-item grid min-h-10.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b",
                  { "is-active": selectedItem?.c_id === item.c_id },
                )}
                key={item.c_id}
                role="listitem"
              >
                <button
                  className="blog-reader-select grid h-full min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-0 bg-transparent px-2.5 py-2.25 text-left"
                  onClick={() => setSelectedId(item.c_id)}
                  type="button"
                >
                  <span className="blog-reader-item-icon text-base leading-none">
                    ✿
                  </span>
                  <Typography.Text
                    className="blog-reader-item-name overflow-hidden text-ellipsis whitespace-nowrap"
                    strong
                  >
                    {renderHighlightedName(item.name, keyword)}
                  </Typography.Text>
                </button>
                <Button
                  aria-label={`编辑 ${item.name}`}
                  className="blog-reader-edit mr-1.5"
                  icon={<EditOutlined />}
                  onClick={() => openClothesEditModal(item)}
                  shape="circle"
                  size="small"
                  type="text"
                />
              </article>
            ))
          ) : (
            <Empty
              className="m-auto"
              description={normalizedKeyword ? "没有匹配的笔记" : "还没有笔记"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </aside>
      <section className="blog-reader-preview flex min-h-0 flex-col overflow-hidden rounded-lg border max-[900px]:min-h-115">
        {selectedItem ? (
          <>
            <div className="blog-reader-preview-header flex min-h-14 items-center justify-between gap-3 border-b px-3.5 py-2.5">
              <div className="blog-reader-preview-title flex min-w-0 items-center gap-2">
                <span className="blog-reader-preview-icon text-base leading-none">
                  ✿
                </span>
                <Typography.Title
                  className="m-0! overflow-hidden text-ellipsis whitespace-nowrap"
                  level={3}
                >
                  {selectedItem.name}
                </Typography.Title>
              </div>
              {previewUrl ? (
                <Button
                  href={previewUrl}
                  icon={<LinkOutlined />}
                  rel="noreferrer"
                  target="_blank"
                  type="default"
                >
                  新窗口打开
                </Button>
              ) : null}
            </div>
            {previewUrl ? (
              <iframe
                className="blog-reader-iframe min-h-0 flex-1 border-0"
                key={previewUrl}
                referrerPolicy="no-referrer"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                src={previewUrl}
                title={selectedItem.name}
              />
            ) : (
              <Empty
                className="m-auto"
                description="这个笔记还没有链接"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ) : (
          <Empty
            className="m-auto"
            description="请选择一条笔记"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </section>
    </div>
  );
}
