"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Button, ColorPicker, Dropdown, Tooltip, theme } from "antd";
import { atlasEditorExtensions } from "./atlas-editor-extensions";
import { opaqueAtlasColor } from "./atlas-colors";
import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  CodeOutlined,
  PictureOutlined,
  TableOutlined,
  FontColorsOutlined,
  ClearOutlined,
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
  const { token } = theme.useToken();
  const editor = useEditor({
    extensions: atlasEditorExtensions,
    content: value,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "min-h-44 min-w-0 p-3 outline-none text-sm leading-7 [overflow-wrap:anywhere] [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_img]:max-w-full [&_a]:underline",
      },
    },
  });
  const tableState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      active: editor?.isActive("table") ?? false,
      merge: editor?.can().mergeCells() ?? false,
      split: editor?.can().splitCell() ?? false,
      color: editor?.getAttributes("textStyle").color as string | undefined,
      code: editor?.isActive("code") ?? false,
    }),
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
      className={`[&_h1]:text-(--home-theme-color) [&_h2]:text-(--home-theme-color) [&_h3]:text-(--home-theme-color) [&_th]:text-(--home-theme-color) [&_code]:rounded [&_code]:bg-[color-mix(in_srgb,var(--home-theme-color)_7%,transparent)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-(--home-theme-color) [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_blockquote]:border-l-2 [&_blockquote]:border-(--home-preview-divider-color) [&_blockquote]:pl-3 [&_blockquote]:text-[color-mix(in_srgb,var(--home-theme-text)_75%,transparent)] ${readOnly ? "min-w-0" : "home-preview-soft-panel min-w-0 rounded-md border"} [&_.tableWrapper]:max-w-full [&_.tableWrapper]:overflow-x-auto [&_table]:my-3 [&_table]:w-full [&_table]:max-w-full [&_table]:table-auto [&_table]:border-collapse [&_td]:border [&_td]:border-(--home-preview-divider-color) [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:whitespace-normal [&_td]:[overflow-wrap:anywhere] [&_th]:border [&_th]:border-(--home-preview-divider-color) [&_th]:bg-[color-mix(in_srgb,var(--home-theme-color)_12%,transparent)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_th]:whitespace-normal [&_th]:[overflow-wrap:anywhere] [&_tr:nth-child(odd)]:bg-[color-mix(in_srgb,var(--home-theme-color)_7%,transparent)] [&_td.selectedCell]:bg-[color-mix(in_srgb,var(--home-theme-color)_18%,transparent)] [&_th.selectedCell]:bg-[color-mix(in_srgb,var(--home-theme-color)_18%,transparent)]`}
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
          <ColorPicker
            value={opaqueAtlasColor(tableState?.color || (tableState?.code ? token.colorPrimary : token.colorText))}
            disabled={!editor}
            disabledAlpha
            allowClear
            presets={[{
              label: "主题配色",
              colors: [token.colorText, token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo].map(opaqueAtlasColor),
            }]}
            getPopupContainer={trigger => trigger.closest("section") ?? document.body}
            onChangeComplete={color => {
              if (!readOnly) editor?.chain().focus().setColor(color.toHexString()).run();
            }}
            onClear={() => {
              if (!readOnly) editor?.chain().focus().unsetColor().run();
            }}
          >
            <Tooltip title="文字颜色">
              <Button
                aria-label="文字颜色"
                type="text"
                disabled={!editor}
                icon={<FontColorsOutlined />}
                style={{ color: tableState?.color || (tableState?.code ? token.colorPrimary : token.colorText) }}
              />
            </Tooltip>
          </ColorPicker>
          <Tooltip title="恢复默认文字颜色">
            <Button
              aria-label="恢复默认文字颜色"
              type="text"
              disabled={!editor}
              icon={<ClearOutlined />}
              onClick={() => editor?.chain().focus().unsetColor().run()}
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
          <Dropdown
            trigger={["click"]}
            getPopupContainer={trigger => trigger.closest("section") ?? document.body}
            menu={{
              items: [
                { key: "insert", label: "插入表格", disabled: !editor || tableState?.active },
                { type: "divider" },
                { key: "row-before", label: "上方插入行", disabled: !tableState?.active },
                { key: "row-after", label: "下方插入行", disabled: !tableState?.active },
                { key: "column-before", label: "左侧插入列", disabled: !tableState?.active },
                { key: "column-after", label: "右侧插入列", disabled: !tableState?.active },
                { key: "header", label: "切换表头行", disabled: !tableState?.active },
                { key: "merge", label: "合并单元格", disabled: !tableState?.merge },
                { key: "split", label: "拆分单元格", disabled: !tableState?.split },
                { type: "divider" },
                { key: "delete-row", label: "删除行", danger: true, disabled: !tableState?.active },
                { key: "delete-column", label: "删除列", danger: true, disabled: !tableState?.active },
                { key: "delete-table", label: "删除表格", danger: true, disabled: !tableState?.active },
              ],
              onClick: ({ key }) => {
                if (!editor || readOnly) return;
                const chain = editor.chain().focus();
                switch (key) {
                  case "insert": chain.insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(); break;
                  case "row-before": chain.addRowBefore().run(); break;
                  case "row-after": chain.addRowAfter().run(); break;
                  case "column-before": chain.addColumnBefore().run(); break;
                  case "column-after": chain.addColumnAfter().run(); break;
                  case "header": chain.toggleHeaderRow().run(); break;
                  case "merge": chain.mergeCells().run(); break;
                  case "split": chain.splitCell().run(); break;
                  case "delete-row": chain.deleteRow().run(); break;
                  case "delete-column": chain.deleteColumn().run(); break;
                  case "delete-table": chain.deleteTable().run(); break;
                }
              },
            }}
          >
            <Tooltip title="表格">
              <Button aria-label="表格" type="text" icon={<TableOutlined />} />
            </Tooltip>
          </Dropdown>
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
      <EditorContent
        editor={editor}
        className={`[&_.tiptap>p]:my-3 [&_.tiptap>p]:text-pretty [&_.tiptap>h1]:mt-6 [&_.tiptap>h1]:mb-3 [&_.tiptap>h1]:text-xl [&_.tiptap>h1]:leading-8 [&_.tiptap>h1]:font-semibold [&_.tiptap>h2]:mt-5 [&_.tiptap>h2]:mb-2 [&_.tiptap>h2]:leading-7 [&_.tiptap>h3]:mt-4 [&_.tiptap>h3]:mb-2 [&_.tiptap>ul]:my-3 [&_.tiptap>ol]:my-3 [&_li+li]:mt-1 [&_.tiptap>blockquote]:my-3 [&_.tiptap>pre]:my-3 [&_.tiptap>h1]:text-balance [&_.tiptap>h2]:text-balance [&_.tiptap>h3]:text-balance [&_.tiptap>:first-child]:mt-0 [&_.tiptap>:last-child]:mb-0 [&_td_p]:m-0 [&_th_p]:m-0 [&_td_p+p]:mt-2 [&_th_p+p]:mt-2 [&_td]:leading-6 [&_th]:leading-6 ${readOnly ? "[&_.tiptap]:min-h-0 [&_.tiptap]:p-0" : ""}`}
      />
    </div>
  );
}
