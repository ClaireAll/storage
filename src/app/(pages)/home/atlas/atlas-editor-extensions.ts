import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Code from "@tiptap/extension-code";
import { TextStyle, Color } from "@tiptap/extension-text-style";

export const atlasEditorExtensions = [
  StarterKit.configure({ code: false }),
  Code.extend({ excludes: "" }),
  // 等宽事件名提供默认色，内层手动文字色优先，清除后回到主题色。
  TextStyle.extend({ priority: 90 }),
  Color,
  ImageExtension,
  TableKit.configure({ table: { renderWrapper: true } }),
];
