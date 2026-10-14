"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Button, Tooltip } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  CodeOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import type { AtlasDocument } from "./atlas-model";

/** 正文编辑使用结构化文档，切换节点时保留页面内草稿。 */
export function AtlasEditor({
  value,
  onChange,
  readOnly,
  onImage,
  onPasteImage,
}: {
  value: AtlasDocument;
  onChange: (value: AtlasDocument) => void;
  readOnly: boolean;
  onImage: (insert: (src: string) => void) => void;
  onPasteImage?: (file: File, insert: (src: string) => void) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, ImageExtension],
    content: value,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "min-h-44 p-3 outline-none text-sm leading-7 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_img]:max-w-full [&_a]:underline",
      },
    },
  });
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value))
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);
  return (
    <div
      className="home-preview-soft-panel rounded-md border"
      onPasteCapture={(event) => {
        const file = [...event.clipboardData.items]
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (file && editor && onPasteImage && !readOnly) {
          event.preventDefault();
          event.stopPropagation();
          onPasteImage(file, (src) =>
            editor.chain().focus().setImage({ src }).run(),
          );
        }
      }}
    >
      {!readOnly && (
        <div className="home-preview-divider flex flex-wrap items-center gap-1 border-b p-2 [&_.ant-btn]:size-8 [&_.ant-btn]:shrink-0">
          <Tooltip title="加粗">
            <Button
              aria-label="加粗"
              type="text"
              icon={<BoldOutlined />}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
          </Tooltip>
          <Tooltip title="斜体">
            <Button
              aria-label="斜体"
              type="text"
              icon={<ItalicOutlined />}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
          </Tooltip>
          <Tooltip title="标题">
            <Button
              aria-label="标题"
              type="text"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              H
            </Button>
          </Tooltip>
          <Tooltip title="列表">
            <Button
              aria-label="列表"
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
          </Tooltip>
          <Tooltip title="有序列表">
            <Button
              aria-label="有序列表"
              type="text"
              icon={<OrderedListOutlined />}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </Tooltip>
          <Tooltip title="代码块">
            <Button
              aria-label="代码块"
              type="text"
              icon={<CodeOutlined />}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
          </Tooltip>
          <Tooltip title="链接">
            <Button
              aria-label="链接"
              type="text"
              icon={<LinkOutlined />}
              onClick={() => {
                const href = window.prompt(
                  "链接地址",
                  editor?.getAttributes("link").href ?? "https://",
                );
                if (href !== null && /^https?:\/\//i.test(href))
                  editor?.chain().focus().setLink({ href }).run();
              }}
            />
          </Tooltip>
          <Tooltip title="图片">
            <Button
              aria-label="图片"
              type="text"
              icon={<PictureOutlined />}
              onClick={() =>
                onImage((src) =>
                  editor?.chain().focus().setImage({ src }).run(),
                )
              }
            />
          </Tooltip>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
