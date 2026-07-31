"use client";

import { isThemeConfig } from "@/app/(pages)/theme/constants";
import { ThemeFallingLights } from "@/app/(pages)/theme/shared-theme-texture";
import { ThemeGeometryTexture } from "@/app/(pages)/theme/theme-geometry-texture";
import { parseThemeColor } from "@/app/(pages)/theme/theme-utils";
import type {
  HobbyShareResolution,
  HobbyShareResolutionStatus,
  HobbyShareSlide,
} from "@/app/api/share/hobby/share-types";
import { normalizeHobbyShareResolution } from "@/app/api/share/hobby/share-utils";
import { FlameWrap } from "@/components/canvasui/FlameWrap";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { A11y, EffectCoverflow, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

const fallbackSharePalette = {
  bg: "#f5f5f5",
  color: "#0d6efd",
  text: "#252833",
};

/** 公开爱好分享视图接收的初始快照与令牌。 */
type HobbyShareViewProps = {
  initialResolution: HobbyShareResolution;
  token: string;
};

/** 公开解析接口可能返回的状态消息。 */
type HobbyShareResolveMessage = {
  message?: string;
  status?: HobbyShareResolutionStatus;
};

/** 将解析失败状态转换为不携带快照内容的页面状态。 */
type HobbyShareCarouselItem = {
  carouselKey: string;
  slide: HobbyShareSlide;
  sourceIndex: number;
};

const hobbyShareCarouselRepeatCount = 3;
const hobbyShareCarouselDelay = 3200;

function createEmptyResolution(
  status: HobbyShareResolutionStatus,
): HobbyShareResolution {
  return {
    expiresAt: null,
    slides: [],
    status,
    theme: null,
  };
}

/** 将主题颜色转换为 Flame Wrap 使用的 0-1 RGB 数组。 */
function toFlameColor(color: string): [number, number, number] {
  const parsedColor = parseThemeColor(color);

  return parsedColor
    ? [parsedColor.r / 255, parsedColor.g / 255, parsedColor.b / 255]
    : [0.31, 0.54, 1];
}

/** 渲染公开爱好分享的访问状态与卡片画廊。 */
function createHobbyShareCarouselItems(
  slides: HobbyShareSlide[],
): HobbyShareCarouselItem[] {
  const repeatCount = slides.length > 1 ? hobbyShareCarouselRepeatCount : 1;

  return Array.from({ length: repeatCount }, (_, repeatIndex) =>
    slides.map((slide, sourceIndex) => ({
      carouselKey: `${repeatIndex}-${sourceIndex}-${slide.hobbyId}-${slide.imageUrl}`,
      slide,
      sourceIndex,
    })),
  ).flat();
}

function getInitialCarouselSlide(slideCount: number) {
  return slideCount > 1 ? slideCount : 0;
}

function normalizeCarouselPosition(
  swiper: SwiperInstance,
  sourceSlideCount: number,
) {
  if (sourceSlideCount <= 1 || swiper.destroyed) {
    return;
  }

  if (swiper.activeIndex >= sourceSlideCount * 2) {
    swiper.slideTo(swiper.activeIndex - sourceSlideCount, 0, false);
    return;
  }

  if (swiper.activeIndex < sourceSlideCount) {
    swiper.slideTo(swiper.activeIndex + sourceSlideCount, 0, false);
  }
}

export function HobbyShareView({
  initialResolution,
  token,
}: HobbyShareViewProps) {
  const passwordAbortControllerRef = useRef<AbortController | null>(null);
  const passwordRequestIdRef = useRef(0);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [resolution, setResolution] = useState(initialResolution);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const [prefersDarkSystem, setPrefersDarkSystem] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreferences = () => {
      setPrefersReducedMotion(motionQuery.matches);
      setPrefersDarkSystem(colorQuery.matches);
    };

    syncPreferences();
    motionQuery.addEventListener("change", syncPreferences);
    colorQuery.addEventListener("change", syncPreferences);

    return () => {
      passwordRequestIdRef.current += 1;
      passwordAbortControllerRef.current?.abort();
      passwordAbortControllerRef.current = null;
      swiperRef.current = null;
      motionQuery.removeEventListener("change", syncPreferences);
      colorQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  const theme =
    resolution.status === "ready" && resolution.theme ? resolution.theme : null;
  const activePalette = theme
    ? theme.mode === "dark" || (theme.mode === "system" && prefersDarkSystem)
      ? theme.dark
      : theme.light
    : fallbackSharePalette;
  const flameColor: [number, number, number] = theme
    ? toFlameColor(theme.aniTheme ?? activePalette.color)
    : [0.31, 0.54, 1];
  const carouselSlides = useMemo(
    () =>
      resolution.status === "ready"
        ? createHobbyShareCarouselItems(resolution.slides)
        : [],
    [resolution],
  );
  const themeStyle = theme
    ? ({
        "--app-shell-bg": activePalette.bg,
        "--app-texture-color": theme.aniTheme ?? activePalette.color,
        "--app-texture-text": activePalette.text,
        "--hobby-share-dark-bg": theme.dark.bg,
        "--hobby-share-dark-color": theme.dark.color,
        "--hobby-share-dark-text": theme.dark.text,
        "--hobby-share-light-bg": theme.light.bg,
        "--hobby-share-light-color": theme.light.color,
        "--hobby-share-light-text": theme.light.text,
      } as CSSProperties)
      : undefined;

  useEffect(() => {
    if (carouselSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      const swiper = swiperRef.current;

      if (!swiper || swiper.destroyed || swiper.animating) {
        return;
      }

      swiper.slideNext();
    }, hobbyShareCarouselDelay);

    return () => window.clearInterval(timer);
  }, [carouselSlides.length]);

  /** 清空访问密码并切换到不携带快照数据的失败状态。 */
  function applyFailedResolution(status: HobbyShareResolutionStatus) {
    setPassword("");
    setResolution(createEmptyResolution(status));
  }

  /** 清空访问密码并展示未改变页面状态的请求错误。 */
  function showPasswordError(message: string) {
    setPassword("");
    setRequestError(message);
  }

  /** 使用访问密码请求受保护的分享快照。 */
  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = passwordRequestIdRef.current + 1;
    passwordRequestIdRef.current = requestId;
    passwordAbortControllerRef.current?.abort();
    const controller = new AbortController();
    passwordAbortControllerRef.current = controller;
    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(
        `/api/share/hobby/${encodeURIComponent(token)}`,
        {
          body: JSON.stringify({ password }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | HobbyShareResolution
        | HobbyShareResolveMessage
        | null;

      if (requestId !== passwordRequestIdRef.current) {
        return;
      }

      const nextResolution = normalizeHobbyShareResolution(
        payload,
        isThemeConfig,
      );

      if (response.ok && nextResolution.status === "ready") {
        setResolution(nextResolution);
        setActiveIndex(0);
        setFailedImages(new Set());
        setPassword("");
        return;
      }

      if (
        nextResolution.status === "invalid_password" ||
        nextResolution.status === "password_required" ||
        nextResolution.status === "expired" ||
        nextResolution.status === "not_found" ||
        response.ok
      ) {
        applyFailedResolution(nextResolution.status);
        return;
      }

      showPasswordError(
        payload && "message" in payload && payload.message
          ? payload.message
          : "读取分享内容失败，请稍后重试",
      );
    } catch {
      if (requestId !== passwordRequestIdRef.current) {
        return;
      }

      showPasswordError("读取分享内容失败，请稍后重试");
    } finally {
      if (requestId === passwordRequestIdRef.current) {
        passwordAbortControllerRef.current = null;
        setIsSubmitting(false);
      }
    }
  }

  /** 记录加载失败的图片，不影响同一爱好中的其他图片。 */
  function markImageFailed(imageKey: string) {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(imageKey);
      return next;
    });
  }

  function moveCarousel(direction: "next" | "prev") {
    const swiper = swiperRef.current;

    if (!swiper || swiper.destroyed || swiper.animating) {
      return;
    }

    if (direction === "prev") {
      swiper.slidePrev();
      return;
    }

    swiper.slideNext();
  }

  let content;

  if (
    resolution.status === "password_required" ||
    resolution.status === "invalid_password"
  ) {
    content = (
      <form
        autoComplete="off"
        className="hobby-share-access"
        onSubmit={submitPassword}
      >
        <h1>请输入访问密码</h1>
        {resolution.status === "invalid_password" ? (
          <p className="hobby-share-status-error">密码错误，请重新输入</p>
        ) : null}
        {requestError ? (
          <p className="hobby-share-status-error">{requestError}</p>
        ) : null}
        <label htmlFor="hobby-share-password">访问密码</label>
        <input
          autoComplete="new-password"
          autoFocus
          id="hobby-share-password"
          maxLength={64}
          name="hobby-share-access-code"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "正在验证" : "查看分享"}
        </button>
      </form>
    );
  } else if (resolution.status === "expired") {
    content = <HobbyShareStatus message="分享链接已失效" />;
  } else if (resolution.status === "not_found") {
    content = <HobbyShareStatus message="分享链接不存在" />;
  } else if (resolution.status === "error") {
    content = <HobbyShareStatus message="读取分享内容失败，请稍后重试" />;
  } else {
    const activeSlide = resolution.slides[activeIndex] ?? resolution.slides[0];

    content = (
      <section
        aria-label={`爱好图片 ${activeIndex + 1}，共 ${resolution.slides.length} 张`}
        className="hobby-share-gallery"
      >
        <Swiper
          centeredSlides
          coverflowEffect={{
            depth: 120,
            modifier: 1,
            rotate: 22,
            scale: 0.74,
            slideShadows: false,
            stretch: 24,
          }}
          className="hobby-share-swiper"
          effect="coverflow"
          grabCursor
          initialSlide={getInitialCarouselSlide(resolution.slides.length)}
          keyboard={{ enabled: true }}
          modules={[A11y, EffectCoverflow, Keyboard]}
          onSlideChange={(swiper) =>
            setActiveIndex(carouselSlides[swiper.activeIndex]?.sourceIndex ?? 0)
          }
          onSlideChangeTransitionEnd={(swiper) =>
            normalizeCarouselPosition(swiper, resolution.slides.length)
          }
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          slidesPerView="auto"
        >
          {carouselSlides.map(({ carouselKey, slide, sourceIndex }) => {
            const imageKey = `${slide.hobbyId}-${sourceIndex}-${slide.imageUrl}`;

            return (
              <SwiperSlide key={carouselKey}>
                <div className="hobby-share-static-wrap">
                  <HobbyShareCard
                    hasImageError={failedImages.has(imageKey)}
                    onImageError={() => markImageFailed(imageKey)}
                    slide={slide}
                  />
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        {resolution.slides.length > 1 ? (
          <div
            aria-label="爱好图片切换"
            className="hobby-share-nav"
            role="group"
          >
            <button
              aria-label="上一张爱好图片"
              className="hobby-share-nav-button hobby-share-nav-button-prev"
              onClick={() => moveCarousel("prev")}
              title="上一张"
              type="button"
            >
              <LeftOutlined aria-hidden="true" />
            </button>
            <button
              aria-label="下一张爱好图片"
              className="hobby-share-nav-button hobby-share-nav-button-next"
              onClick={() => moveCarousel("next")}
              title="下一张"
              type="button"
            >
              <RightOutlined aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {activeSlide && !prefersReducedMotion ? (
          <div className="hobby-share-flame-overlay">
            <FlameWrap
              captureContent={false}
              className="hobby-share-flame-wrap"
              color={flameColor}
              height={88}
              intensity={1.05}
              melt={2}
              radius={24}
              rim={2.9}
              scale={0.62}
              smoke={0.48}
              sparkDensity={1.2}
              sparks={1.6}
              speed={0.32}
              spread={20}
              turbulence={0.62}
            >
              <div className="hobby-share-flame-target" />
            </FlameWrap>
          </div>
        ) : null}
        {activeSlide ? (
          <h2 className="hobby-share-title" title={activeSlide.name}>
            <span>{activeSlide.name}</span>
          </h2>
        ) : null}
      </section>
    );
  }

  return (
    <main
      className="hobby-share-page"
      data-theme-mode={theme?.mode}
      data-theme-texture={theme?.texture}
      style={themeStyle}
    >
      <ThemeGeometryTexture
        className="hobby-share-geometry-texture"
        texture={theme?.texture ?? "none"}
      />
      <ThemeFallingLights
        isActive={theme?.texture === "meteor"}
        variant="shared"
      />
      {content}
    </main>
  );
}

/** 公开分享页的单张图片卡片。 */
function HobbyShareCard({
  hasImageError,
  onImageError,
  slide,
}: {
  hasImageError: boolean;
  onImageError: () => void;
  slide: HobbyShareSlide;
}) {
  return (
    <article className="hobby-share-card">
      <div className="hobby-share-image-viewport">
        {hasImageError ? (
          <p className="hobby-share-image-error">图片加载失败</p>
        ) : (
          <div className="hobby-share-image-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={slide.name}
              className="hobby-share-image"
              onError={onImageError}
              src={slide.imageUrl}
            />
          </div>
        )}
      </div>
    </article>
  );
}

/** 公开分享页的终止状态提示。 */
function HobbyShareStatus({ message }: { message: string }) {
  return (
    <section className="hobby-share-status" role="status">
      <h1>{message}</h1>
    </section>
  );
}
