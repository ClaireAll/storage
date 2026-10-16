"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Splitter } from "antd";

const widthKey = "atlas-inspector-width";

export function inspectorWidth(value: string | null): number {
  if (value === null || value.trim() === "") return 360;
  const width = Number(value);
  return Number.isFinite(width) ? Math.max(280, Math.min(720, width)) : 360;
}

/** 只记住阅读宽度；画布始终挂载，展开详情不改变图谱或视口。 */
export function AtlasInspectorLayout({
  children, details, visible, expanded,
}: {
  children: ReactNode;
  details: ReactNode;
  visible: boolean;
  expanded: boolean;
}) {
  const [width, setWidth] = useState(360);
  useEffect(() => {
    try {
      const saved = inspectorWidth(localStorage.getItem(widthKey));
      queueMicrotask(() => setWidth(saved));
    } catch { /* 浏览器禁用存储时使用默认宽度。 */ }
  }, []);
  return (
    <Splitter
      className="min-h-0 min-w-0 flex-1"
      classNames={{ panel: "flex min-h-0 min-w-0 overflow-hidden!" }}
      orientation="horizontal"
      lazy
      onResize={sizes => {
        if (visible && !expanded) setWidth(inspectorWidth(String(sizes[1])));
      }}
      onResizeEnd={sizes => {
        if (!visible || expanded) return;
        const next = inspectorWidth(String(sizes[1]));
        setWidth(next);
        try { localStorage.setItem(widthKey, String(next)); } catch { /* 宽度偏好不影响阅读。 */ }
      }}
    >
      <Splitter.Panel min={expanded && visible ? 0 : 120} size={expanded && visible ? 0 : undefined} resizable={visible && !expanded}>
        {children}
      </Splitter.Panel>
      <Splitter.Panel
        min={visible ? (expanded ? 0 : 280) : 0}
        max={visible ? (expanded ? "100%" : "75%") : 0}
        size={visible ? (expanded ? "100%" : width) : 0}
        resizable={visible && !expanded}
      >
        {details}
      </Splitter.Panel>
    </Splitter>
  );
}
