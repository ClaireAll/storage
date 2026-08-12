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
  brightness: 0.78,
  contrast: 3.8,
  crispness: 2.1,
  detail: 1.7,
  edgeFade: 0.06,
  frost: 0.28,
  haze: 0.62,
  highlight: 0.58,
  highlightStrength: 0.94,
  introDuration: 2.2,
  meltEdges: true,
  meltNoise: 0.42,
  meltRadius: 0.22,
  meltStrength: 0.82,
  opacity: 0.96,
  observeScroll: false,
  pixelRatio: 1,
  quality: 0.4,
  refraction: 0.92,
  refreeze: 2.4,
  saturation: 0.84,
  shimmer: 0,
  strength: 1.15,
  textureScale: 1.7,
  tintStrength: 0.82,
  tintThick: [0.27, 0.33, 0.41] as [number, number, number],
  tintThin: [0.02, 0.03, 0.06] as [number, number, number],
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

/** Canvas UI Frost styled as a dark ice texture without capturing application UI. */
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
      <div className="absolute inset-0 bg-[#04070c]" />
      <canvas className="hidden" ref={sourceRef} />
      <div className="hidden" ref={contentRef} />
      <canvas className="absolute inset-0 h-full w-full" ref={outputRef} />
    </div>
  );
}

function isFrostInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(frostInteractiveSelector));
}
