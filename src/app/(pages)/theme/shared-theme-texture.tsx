"use client";

import type { CSSProperties } from "react";
import type { AnimationEvent } from "react";
import { useEffect, useState } from "react";
import { ThemeGeometryTexture } from "./theme-geometry-texture";
import type { ThemeTexture } from "./types";

export const themeTextureChangeEvent = "storage-theme-texture-change";

export type ThemeTextureChangeDetail = {
  background: string;
  color: string;
  text: string;
  texture: ThemeTexture;
};

type FallingLight = {
  alpha: number;
  delay: string;
  duration: string;
  height: string;
  headHeight: string;
  headWidth: string;
  id: number;
  left: string;
  runId: string;
  width: string;
};

const fallingLightCount = 22;

const defaultTextureDetail: ThemeTextureChangeDetail = {
  background: "transparent",
  color: "#5c8cff",
  text: "#252833",
  texture: "none",
};

export function SharedThemeTexture() {
  const [textureDetail, setTextureDetail] = useState(defaultTextureDetail);

  useEffect(() => {
    function handleTextureChange(event: Event) {
      const customEvent = event as CustomEvent<ThemeTextureChangeDetail>;
      setTextureDetail(customEvent.detail);
    }

    window.addEventListener(themeTextureChangeEvent, handleTextureChange);

    return () => {
      window.removeEventListener(themeTextureChangeEvent, handleTextureChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`theme-shared-texture-root theme-shared-texture-${textureDetail.texture}`}
      style={{
        "--app-shell-bg": textureDetail.background,
        "--app-texture-color": textureDetail.color,
        "--app-texture-text": textureDetail.text,
        backgroundColor: textureDetail.background,
      } as CSSProperties}
    >
      <span
        className={`theme-shared-texture theme-texture-${textureDetail.texture}`}
      />
      <ThemeFallingLights
        isActive={textureDetail.texture === "meteor"}
        variant="shared"
      />
      <ThemeGeometryTexture
        className="theme-shared-geometry-texture"
        texture={textureDetail.texture}
      />
    </div>
  );
}

export function ThemeTexturePublisher({
  background,
  color,
  text,
  texture,
}: ThemeTextureChangeDetail) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<ThemeTextureChangeDetail>(themeTextureChangeEvent, {
        detail: {
          background,
          color,
          text,
          texture,
        },
      }),
    );
  }, [background, color, text, texture]);

  return null;
}

export function ThemeFallingLights({
  isActive,
  variant,
}: {
  isActive: boolean;
  variant: "preview" | "shared";
}) {
  const [lights, setLights] = useState<FallingLight[]>([]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setLights(
        Array.from({ length: fallingLightCount }, (_, index) =>
          createFallingLight(index, variant, true),
        ),
      );
    });

    return () => cancelAnimationFrame(frameId);
  }, [isActive, variant]);

  if (!isActive) {
    return null;
  }

  function randomizeLight(lightId: number) {
    setLights((currentLights) =>
      currentLights.map((light) =>
        light.id === lightId
          ? createFallingLight(lightId, variant, false)
          : light,
      ),
    );
  }

  function handleLightEnd(
    event: AnimationEvent<HTMLSpanElement>,
    lightId: number,
  ) {
    if (
      event.currentTarget === event.target &&
      event.animationName === "theme-meteor-drop"
    ) {
      randomizeLight(lightId);
    }
  }

  return (
    <span
      className="theme-meteor-lines theme-meteor-lines-active"
      data-variant={variant}
    >
      {lights.map((light) => (
        <span
          className="theme-meteor-line"
          key={`${light.id}-${light.runId}`}
          onAnimationEnd={(event) => handleLightEnd(event, light.id)}
          style={
            {
              "--falling-line-alpha": light.alpha,
              "--falling-line-delay": light.delay,
              "--falling-line-duration": light.duration,
              "--falling-line-head-height": light.headHeight,
              "--falling-line-head-width": light.headWidth,
              "--falling-line-height": light.height,
              "--falling-line-left": light.left,
              "--falling-line-width": light.width,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function createFallingLight(
  id: number,
  variant: "preview" | "shared",
  isInitial: boolean,
): FallingLight {
  const duration = randomFloat(6.4, 13.2, 1);
  const heightUnit = variant === "preview" ? "%" : "vh";
  const isLeftSide = Math.random() < 0.5;
  const useSideLane = Math.random() < 0.86;
  const initialDelayMax = id < 8 ? 1.2 : duration;
  const delay = isInitial
    ? randomFloat(0, initialDelayMax, 2)
    : randomFloat(0.1, 1.4, 2);
  const left = useSideLane
    ? isLeftSide
      ? randomFloat(2, 26, 2)
      : randomFloat(74, 98, 2)
    : randomFloat(28, 72, 2);

  return {
    alpha: randomFloat(0.74, 1, 2),
    delay: `${delay}s`,
    duration: `${duration}s`,
    height: `${randomInt(variant === "preview" ? 18 : 8, variant === "preview" ? 30 : 14)}${heightUnit}`,
    headHeight: `${randomInt(variant === "preview" ? 6 : 7, variant === "preview" ? 10 : 12)}px`,
    headWidth: `${randomInt(2, 3)}px`,
    id,
    left: `${left}%`,
    runId: Math.random().toString(36).slice(2),
    width: `${randomInt(1, 2)}px`,
  };
}

function randomFloat(min: number, max: number, digits = 1) {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(digits));
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
