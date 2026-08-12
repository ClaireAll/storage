"use client";

import { createFrost, type FrostOptions } from "@/components/canvasui/Frost";
import { useEffect, useRef } from "react";
import {
  scrollActivityChangeEventName,
  type ScrollActivityChangeDetail,
} from "../common/scroll-activity-provider";
import type { ThemeTexture } from "./types";

type ThemeFrostTextureProps = {
  texture: ThemeTexture;
  variant: "preview" | "shared";
};

const frostOptions = {
  brightness: 0.96,
  crispness: 1.15,
  detail: 1.4,
  edgeFade: 0.16,
  frost: 0.12,
  highlight: 0.24,
  highlightStrength: 0.68,
  introDuration: 1.4,
  meltEdges: false,
  meltNoise: 0.32,
  meltRadius: 0.18,
  meltStrength: 0.78,
  opacity: 0.72,
  observeScroll: false,
  pixelRatio: 1,
  quality: 0.4,
  refraction: 0.76,
  refreeze: 2.6,
  shimmer: 0,
  strength: 0.78,
  textureScale: 2.4,
  tintStrength: 0.38,
  tintThick: [0.9, 0.95, 1] as [number, number, number],
  tintThin: [0.58, 0.7, 0.96] as [number, number, number],
} satisfies FrostOptions;

const frostInteractiveSelector = [
  "a",
  "article",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='dialog']",
  ".ant-card",
  ".ant-dropdown",
  ".ant-modal",
  ".ant-popover",
  ".ant-select-dropdown",
  ".ant-drawer",
].join(",");

/** Canvas UI Frost adapted as a background-only texture without DOM capture. */
export function ThemeFrostTexture({
  texture,
  variant,
}: ThemeFrostTextureProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (texture !== "frost") {
      return;
    }

    const content = contentRef.current;
    const output = outputRef.current;
    const source = sourceRef.current;

    if (!content || !output || !source) {
      return;
    }

    const frost = createFrost({ content, output, source }, frostOptions);

    if (!frost || variant === "preview") {
      return () => frost?.destroy();
    }

    const frostInstance = frost;
    const outputCanvas = output;
    let frameId = 0;
    let latestPoint: { x: number; y: number } | null = null;
    let isScrolling = false;

    function flushMelt() {
      frameId = 0;

      if (isScrolling || !latestPoint) {
        return;
      }

      const point = latestPoint;
      latestPoint = null;
      const rect = outputCanvas.getBoundingClientRect();

      frostInstance.melt(
        Math.min(1, Math.max(0, (point.x - rect.left) / Math.max(rect.width, 1))),
        Math.min(1, Math.max(0, (point.y - rect.top) / Math.max(rect.height, 1))),
      );
    }

    function requestMelt(event: PointerEvent) {
      if (isScrolling || isFrostInteractiveTarget(event.target)) {
        return;
      }

      latestPoint = { x: event.clientX, y: event.clientY };

      if (!frameId) {
        frameId = window.requestAnimationFrame(flushMelt);
      }
    }

    function handleScrollActivityChange(event: Event) {
      const { isScrolling: nextIsScrolling } = (
        event as CustomEvent<ScrollActivityChangeDetail>
      ).detail;

      isScrolling = nextIsScrolling;
      frostInstance.setPaused(nextIsScrolling);

      if (nextIsScrolling) {
        latestPoint = null;
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }

    window.addEventListener("pointermove", requestMelt, { passive: true });
    window.addEventListener("pointerdown", requestMelt, { passive: true });
    window.addEventListener(
      scrollActivityChangeEventName,
      handleScrollActivityChange,
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", requestMelt);
      window.removeEventListener("pointerdown", requestMelt);
      window.removeEventListener(
        scrollActivityChangeEventName,
        handleScrollActivityChange,
      );
      frostInstance.destroy();
    };
  }, [texture, variant]);

  if (texture !== "frost") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="theme-frost-texture pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgb(255_255_255_/_45%),transparent_32%),radial-gradient(circle_at_82%_76%,rgb(176_202_255_/_32%),transparent_36%),linear-gradient(135deg,rgb(202_222_255_/_34%),rgb(118_153_222_/_12%)_46%,rgb(255_255_255_/_24%))]" />
      <canvas className="hidden" ref={sourceRef} />
      <div className="hidden" ref={contentRef} />
      <canvas className="absolute inset-0 h-full w-full" ref={outputRef} />
    </div>
  );
}

function isFrostInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(frostInteractiveSelector));
}
