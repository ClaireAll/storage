"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { pick, randomFloat, randomInt } from "./theme-utils";
import type { ThemeTexture } from "./types";

type GeometryShape = "circle" | "diamond" | "square" | "triangle";

type GeometryItem = {
  alpha: number;
  delay: string;
  driftEnd: string;
  driftStart: string;
  duration: string;
  endY: string;
  id: number;
  left: string;
  lightness: number;
  rotateStart: string;
  rotateTurn: string;
  saturation: number;
  shape: GeometryShape;
  size: string;
  startY: string;
  top: string;
};

type ThemeGeometryTextureProps = {
  className?: string;
  style?: CSSProperties;
  texture: ThemeTexture;
  variant?: "page" | "preview";
};

const pageGeometryCount = 34;
const previewGeometryCount = 10;
const shapes: GeometryShape[] = ["circle", "diamond", "square", "triangle"];

export function ThemeGeometryTexture({
  className,
  style,
  texture,
  variant = "page",
}: ThemeGeometryTextureProps) {
  const [items, setItems] = useState<GeometryItem[]>([]);

  useEffect(() => {
    if (texture !== "geometry") {
      return;
    }

    const itemCount =
      variant === "preview" ? previewGeometryCount : pageGeometryCount;

    const frameId = requestAnimationFrame(() => {
      setItems(
        Array.from({ length: itemCount }, (_, index) =>
          createGeometryItem(index, variant),
        ),
      );
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [texture, variant]);

  if (texture !== "geometry") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={cn("theme-geometry-texture", className, {
        "theme-geometry-texture-preview": variant === "preview",
      })}
      style={style}
    >
      {items.map((item) => (
        <span
          className={cn(
            "theme-geometry-item",
            `theme-geometry-${item.shape}`,
          )}
          key={item.id}
          style={
            {
              "--geometry-alpha": item.alpha,
              "--geometry-delay": item.delay,
              "--geometry-drift-end": item.driftEnd,
              "--geometry-drift-start": item.driftStart,
              "--geometry-duration": item.duration,
              "--geometry-end-y": item.endY,
              "--geometry-left": item.left,
              "--geometry-lightness": `${item.lightness}%`,
              "--geometry-rotate-start": item.rotateStart,
              "--geometry-rotate-turn": item.rotateTurn,
              "--geometry-saturation": `${item.saturation}%`,
              "--geometry-size": item.size,
              "--geometry-start-y": item.startY,
              "--geometry-top": item.top,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function createGeometryItem(
  id: number,
  variant: "page" | "preview",
): GeometryItem {
  const unit = variant === "preview" ? "%" : "vw";
  const shape = pick(shapes);
  const size = randomInt(8, variant === "preview" ? 28 : 92);
  const duration = randomFloat(12, variant === "preview" ? 20 : 30);
  const delay = randomFloat(
    variant === "preview" ? -duration * 0.48 : -duration,
    0,
    2,
  );
  const rotateDirection = Math.random() > 0.5 ? 1 : -1;

  return {
    alpha: randomFloat(
      variant === "preview" ? 0.16 : 0.28,
      variant === "preview" ? 0.34 : 0.58,
      2,
    ),
    delay: `${delay}s`,
    driftEnd: `${randomInt(variant === "preview" ? -8 : -18, variant === "preview" ? 8 : 18)}px`,
    driftStart: `${randomInt(variant === "preview" ? -6 : -12, variant === "preview" ? 6 : 12)}px`,
    duration: `${duration}s`,
    endY:
      variant === "preview"
        ? `-${randomInt(360, 430)}px`
        : `calc((var(--geometry-size) + ${randomInt(24, 52)}px) * -1)`,
    id,
    left: `${randomSidePosition()}${unit}`,
    lightness: randomInt(38, 78),
    rotateStart: `${randomInt(0, 359)}deg`,
    rotateTurn: `${rotateDirection * randomInt(180, 760)}deg`,
    saturation: randomInt(38, 98),
    shape,
    size: `${size}px`,
    startY: variant === "preview" ? "0px" : `${randomInt(104, 118)}vh`,
    top: variant === "preview" ? `${randomInt(104, 118)}%` : "0",
  };
}

function randomSidePosition() {
  return randomInt(0, 100);
}
