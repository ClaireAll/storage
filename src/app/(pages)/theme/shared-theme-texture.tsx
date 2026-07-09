"use client";

import type { CSSProperties } from "react";
import type { AnimationEvent } from "react";
import { useEffect, useState } from "react";
import { ThemeGeometryTexture } from "./theme-geometry-texture";
import { randomFloat } from "./theme-utils";
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

type MeteorSpark = {
  alpha: number;
  delay: string;
  driftX: string;
  driftY: string;
  duration: string;
  id: number;
  left: string;
  runId: string;
  size: string;
  top: string;
};

const fallingLightCount = 22;
const meteorSparkCount = 30;

const defaultTextureDetail: ThemeTextureChangeDetail = {
  background: "transparent",
  color: "#5c8cff",
  text: "#252833",
  texture: "none",
};

let latestThemeTextureDetail = defaultTextureDetail;

export function SharedThemeTexture() {
  const [textureDetail, setTextureDetail] = useState(
    () => latestThemeTextureDetail,
  );

  useEffect(() => {
    function syncTextureDetail(nextTextureDetail: ThemeTextureChangeDetail) {
      setTextureDetail((currentDetail) =>
        isSameTextureDetail(currentDetail, nextTextureDetail)
          ? currentDetail
          : nextTextureDetail,
      );
    }

    function handleTextureChange(event: Event) {
      const customEvent = event as CustomEvent<ThemeTextureChangeDetail>;
      syncTextureDetail(customEvent.detail);
    }

    window.addEventListener(themeTextureChangeEvent, handleTextureChange);
    syncTextureDetail(latestThemeTextureDetail);

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

/** 判断两组主题纹理参数是否一致，用于避免跨页面切换时重复刷新共享纹理。 */
function isSameTextureDetail(
  currentDetail: ThemeTextureChangeDetail,
  nextDetail: ThemeTextureChangeDetail,
) {
  return (
    currentDetail.background === nextDetail.background &&
    currentDetail.color === nextDetail.color &&
    currentDetail.text === nextDetail.text &&
    currentDetail.texture === nextDetail.texture
  );
}

export function ThemeTexturePublisher({
  background,
  color,
  text,
  texture,
}: ThemeTextureChangeDetail) {
  useEffect(() => {
    publishThemeTextureDetail({
      background,
      color,
      text,
      texture,
    });
  }, [background, color, text, texture]);

  return null;
}

function publishThemeTextureDetail(
  nextTextureDetail: ThemeTextureChangeDetail,
) {
  latestThemeTextureDetail = nextTextureDetail;
  window.dispatchEvent(
    new CustomEvent<ThemeTextureChangeDetail>(themeTextureChangeEvent, {
      detail: nextTextureDetail,
    }),
  );
}

export function ThemeFallingLights({
  isActive,
  variant,
}: {
  isActive: boolean;
  variant: "preview" | "shared";
}) {
  const [lights, setLights] = useState<FallingLight[]>([]);
  const [sparks, setSparks] = useState<MeteorSpark[]>([]);

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
      setSparks(
        Array.from({ length: meteorSparkCount }, (_, index) =>
          createMeteorSpark(index, variant),
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

  function randomizeSpark(sparkId: number) {
    setSparks((currentSparks) =>
      currentSparks.map((spark) =>
        spark.id === sparkId ? createMeteorSpark(sparkId, variant) : spark,
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

  function handleSparkEnd(
    event: AnimationEvent<HTMLSpanElement>,
    sparkId: number,
  ) {
    if (
      event.currentTarget === event.target &&
      event.animationName === "theme-meteor-spark-twinkle"
    ) {
      randomizeSpark(sparkId);
    }
  }

  return (
    <span
      className="theme-meteor-lines theme-meteor-lines-active"
      data-variant={variant}
    >
      {sparks.map((spark) => (
        <span
          className="theme-meteor-spark"
          key={`${spark.id}-${spark.runId}`}
          onAnimationEnd={(event) => handleSparkEnd(event, spark.id)}
          style={
            {
              "--meteor-spark-alpha": spark.alpha,
              "--meteor-spark-delay": spark.delay,
              "--meteor-spark-drift-x": spark.driftX,
              "--meteor-spark-drift-y": spark.driftY,
              "--meteor-spark-duration": spark.duration,
              "--meteor-spark-left": spark.left,
              "--meteor-spark-size": spark.size,
              "--meteor-spark-top": spark.top,
            } as CSSProperties
          }
        />
      ))}
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
  const heightUnit = variant === "preview" ? "%" : "vh";
  const isLeftSide = Math.random() < 0.5;
  const useSideLane = Math.random() < 0.78;
  const sizeScale = createMeteorSizeScale();
  const duration = randomFloat(6.2, 13.8, 1) / Math.min(sizeScale, 1.22);
  const initialDelayMax = id < 8 ? 1.2 : duration;
  const delay = isInitial
    ? randomFloat(0, initialDelayMax, 2)
    : randomFloat(0.1, 1.4, 2);
  const left = useSideLane
    ? isLeftSide
      ? randomFloat(2, 26, 2)
      : randomFloat(74, 98, 2)
    : randomFloat(28, 72, 2);
  const baseHeight = randomFloat(
    (variant === "preview" ? 16 : 7) * sizeScale,
    (variant === "preview" ? 32 : 18) * sizeScale,
    2,
  );
  const lineWidth = randomFloat(0.72, 1.42, 2) * sizeScale;
  const headHeight = randomFloat(5.8, 11.8, 2) * sizeScale;
  const headWidth = lineWidth + randomFloat(1.2, 2.4, 2) * sizeScale;

  return {
    alpha: randomFloat(0.62, 1, 2),
    delay: `${delay}s`,
    duration: `${duration}s`,
    height: `${baseHeight}${heightUnit}`,
    headHeight: `${headHeight.toFixed(2)}px`,
    headWidth: `${headWidth.toFixed(2)}px`,
    id,
    left: `${left}%`,
    runId: Math.random().toString(36).slice(2),
    width: `${lineWidth.toFixed(2)}px`,
  };
}

function createMeteorSizeScale() {
  const mode = Math.random();

  if (mode < 0.24) {
    return randomFloat(0.58, 0.82, 2);
  }

  if (mode < 0.82) {
    return randomFloat(0.86, 1.18, 2);
  }

  return randomFloat(1.24, 1.52, 2);
}

function createMeteorSpark(
  id: number,
  variant: "preview" | "shared",
): MeteorSpark {
  const isPreview = variant === "preview";
  const position = createMeteorSparkPosition();

  return {
    alpha: randomFloat(0.58, 0.95, 2),
    delay: `${randomFloat(0, isPreview ? 3.5 : 7.5, 2)}s`,
    driftX: `${randomFloat(-18, 18, 2)}px`,
    driftY: `${randomFloat(-14, 14, 2)}px`,
    duration: `${randomFloat(isPreview ? 2.8 : 4.6, isPreview ? 5.4 : 9.2, 2)}s`,
    id,
    left: `${position.left}%`,
    runId: Math.random().toString(36).slice(2),
    size: `${randomFloat(isPreview ? 3.2 : 4.2, isPreview ? 5.4 : 7.2, 2)}px`,
    top: `${position.top}%`,
  };
}

function createMeteorSparkPosition() {
  const mode = Math.random();

  if (mode < 0.28) {
    return {
      left: randomFloat(1, 99, 2),
      top: randomFloat(1, 20, 2),
    };
  }

  if (mode < 0.54) {
    return {
      left: Math.random() < 0.5 ? randomFloat(1, 24, 2) : randomFloat(76, 99, 2),
      top: randomFloat(8, 96, 2),
    };
  }

  if (mode < 0.78) {
    const left = randomFloat(6, 94, 2);

    return {
      left,
      top: Math.min(98, Math.max(2, left * 0.62 + randomFloat(-22, 22, 2))),
    };
  }

  return {
    left: randomFloat(4, 96, 2),
    top: randomFloat(4, 96, 2),
  };
}
