"use client";

import { useHomeContentActions } from "@/app/(pages)/home/home-view";
import { OverlayScrollArea } from "@/app/(pages)/common/overlay-scrollbar";
import { cn } from "@/lib/utils";
import {
  EditOutlined,
  LinkOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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

type BlogReaderListProps = {
  filteredItems: ClothesItem[];
  keyword: string;
  normalizedKeyword: string;
  onCreate: () => void;
  onEdit: (item: ClothesItem) => void;
  onKeywordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeywordCompositionEnd: (
    event: React.CompositionEvent<HTMLInputElement>,
  ) => void;
  onSelect: (id: string | number) => void;
  selectedItem: ClothesItem | null;
};

type BlogReaderPreviewProps = {
  previewUrl: string;
  selectedItem: ClothesItem | null;
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

function BlogReaderList({
  filteredItems,
  keyword,
  normalizedKeyword,
  onCreate,
  onEdit,
  onKeywordChange,
  onKeywordCompositionEnd,
  onSelect,
  selectedItem,
}: BlogReaderListProps) {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col gap-3 max-[900px]:min-h-65">
      <div className="grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
        <Input
          allowClear
          className="blog-reader-search h-8"
          onChange={onKeywordChange}
          onCompositionEnd={onKeywordCompositionEnd}
          placeholder="搜索笔记名称"
          prefix={<SearchOutlined />}
          value={keyword}
        />
        <Button
          aria-label="新增笔记"
          className="blog-reader-add h-8 w-8 min-w-8 rounded-lg p-0"
          icon={<PlusOutlined />}
          onClick={onCreate}
          type="primary"
        />
      </div>
      <OverlayScrollArea
        className="min-h-0 flex-1"
        viewportClassName="blog-reader-list rounded-lg border"
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
                onClick={() => onSelect(item.c_id)}
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
                onClick={() => onEdit(item)}
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
      </OverlayScrollArea>
    </aside>
  );
}

function BlogReaderPreview({ previewUrl, selectedItem }: BlogReaderPreviewProps) {
  return (
    <section className="blog-reader-preview flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border max-[900px]:min-h-115">
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
  );
}

export function BlogReader({ items }: BlogReaderProps) {
  const { openClothesCreateModal, openClothesEditModal } =
    useHomeContentActions();
  const [isListCollapsed, setIsListCollapsed] = useState(false);
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

  const readerList = (
    <BlogReaderList
      filteredItems={filteredItems}
      keyword={keyword}
      normalizedKeyword={normalizedKeyword}
      onCreate={openClothesCreateModal}
      onEdit={openClothesEditModal}
      onKeywordChange={changeKeyword}
      onKeywordCompositionEnd={finishKeywordComposition}
      onSelect={setSelectedId}
      selectedItem={selectedItem}
    />
  );
  const preview = (
    <BlogReaderPreview previewUrl={previewUrl} selectedItem={selectedItem} />
  );

  return (
    <div className="relative h-full min-h-0 w-full">
      <div
        className={cn(
          "grid h-full min-h-0 w-full",
          isListCollapsed
            ? "grid-cols-1"
            : "grid-cols-[minmax(220px,280px)_minmax(0,1fr)] gap-3.5 max-[900px]:grid-cols-1",
        )}
      >
        <div hidden={isListCollapsed} id="blog-reader-list-panel">
          {!isListCollapsed ? readerList : null}
        </div>
        {preview}
      </div>
      <Button
        aria-controls="blog-reader-list-panel"
        aria-expanded={!isListCollapsed}
        aria-label={isListCollapsed ? "展开笔记列表" : "收起笔记列表"}
        className="blog-reader-list-toggle !absolute -left-8 top-6 z-10 size-9 rounded-full p-0 shadow-sm"
        icon={isListCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setIsListCollapsed((collapsed) => !collapsed)}
        shape="circle"
        type="primary"
      />
    </div>
  );
}
