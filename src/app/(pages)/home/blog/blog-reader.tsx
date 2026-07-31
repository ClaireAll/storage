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
    <div className="blog-reader-shell">
      <aside className="blog-reader-sidebar">
        <div className="blog-reader-toolbar">
          <Input
            allowClear
            className="blog-reader-search"
            onChange={changeKeyword}
            onCompositionEnd={finishKeywordComposition}
            placeholder="搜索笔记名称"
            prefix={<SearchOutlined />}
            value={keyword}
          />
          <Button
            aria-label="新增笔记"
            className="blog-reader-add"
            icon={<PlusOutlined />}
            onClick={openClothesCreateModal}
            type="primary"
          />
        </div>
        <div className="blog-reader-list" role="list">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <article
                aria-current={selectedItem?.c_id === item.c_id ? "true" : undefined}
                className={cn("blog-reader-list-item", {
                  "is-active": selectedItem?.c_id === item.c_id,
                })}
                key={item.c_id}
                role="listitem"
              >
                <button
                  className="blog-reader-select"
                  onClick={() => setSelectedId(item.c_id)}
                  type="button"
                >
                  <span className="blog-reader-item-icon">✿</span>
                  <Typography.Text className="blog-reader-item-name" strong>
                    {renderHighlightedName(item.name, keyword)}
                  </Typography.Text>
                </button>
                <Button
                  aria-label={`编辑 ${item.name}`}
                  className="blog-reader-edit"
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
              className="blog-reader-empty"
              description={normalizedKeyword ? "没有匹配的笔记" : "还没有笔记"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </aside>
      <section className="blog-reader-preview">
        {selectedItem ? (
          <>
            <div className="blog-reader-preview-header">
              <div className="blog-reader-preview-title">
                <span className="blog-reader-preview-icon">✿</span>
                <Typography.Title level={3}>{selectedItem.name}</Typography.Title>
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
                className="blog-reader-iframe"
                key={previewUrl}
                referrerPolicy="no-referrer"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                src={previewUrl}
                title={selectedItem.name}
              />
            ) : (
              <Empty
                description="这个笔记还没有链接"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </>
        ) : (
          <Empty description="请选择一条笔记" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </section>
    </div>
  );
}
