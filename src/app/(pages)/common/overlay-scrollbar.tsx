"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type OverlayScrollbarAxis = "horizontal" | "vertical";

type OverlayScrollbarProps = {
  horizontal?: boolean;
  scrollTarget: HTMLElement | null;
  vertical?: boolean;
};

type OverlayScrollbarHostProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  horizontal?: boolean;
  horizontalTargetSelector?: string;
  targetSelector: string;
};

type OverlayScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  horizontal?: boolean;
  vertical?: boolean;
  viewportClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
};

type ScrollbarDragState = {
  axis: OverlayScrollbarAxis;
  maxOffset: number;
  pointerId: number;
  scrollTarget: HTMLElement;
  startOffset: number;
  startPointerPosition: number;
  trackTravel: number;
};

const minThumbSize = 32;

function getAxisMetrics(scrollTarget: HTMLElement, axis: OverlayScrollbarAxis) {
  const viewportSize =
    axis === "vertical" ? scrollTarget.clientHeight : scrollTarget.clientWidth;
  const contentSize =
    axis === "vertical" ? scrollTarget.scrollHeight : scrollTarget.scrollWidth;
  const maxOffset = Math.max(contentSize - viewportSize, 0);

  return { contentSize, maxOffset, viewportSize };
}

function setAxisMetrics(
  host: HTMLElement,
  scrollTarget: HTMLElement,
  axis: OverlayScrollbarAxis,
) {
  const { contentSize, maxOffset, viewportSize } = getAxisMetrics(
    scrollTarget,
    axis,
  );
  const hasOverflow = maxOffset > 0;
  const trackSize = Math.max(viewportSize - 16, 0);
  const thumbSize = hasOverflow
    ? Math.min(
        trackSize,
        Math.max(minThumbSize, (trackSize * viewportSize) / contentSize),
      )
    : 0;
  const prefix = axis === "vertical" ? "vertical" : "horizontal";

  host.style.setProperty(
    `--storage-overlay-${prefix}-track-size`,
    `${trackSize}px`,
  );
  host.style.setProperty(
    `--storage-overlay-${prefix}-thumb-size`,
    `${thumbSize}px`,
  );
  host.style.setProperty(
    `--storage-overlay-${prefix}-thumb-travel`,
    `${Math.max(trackSize - thumbSize, 0)}px`,
  );
  host.toggleAttribute(`data-storage-overlay-${prefix}-scrollable`, hasOverflow);
}

export function OverlayScrollbar({
  horizontal = false,
  scrollTarget,
  vertical = true,
}: OverlayScrollbarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const verticalTrackRef = useRef<HTMLButtonElement>(null);
  const horizontalTrackRef = useRef<HTMLButtonElement>(null);
  const verticalThumbRef = useRef<HTMLSpanElement>(null);
  const horizontalThumbRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<ScrollbarDragState | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  const refresh = useCallback(() => {
    const host = hostRef.current;

    if (!host || !scrollTarget) {
      return;
    }

    setAxisMetrics(host, scrollTarget, "vertical");
    setAxisMetrics(host, scrollTarget, "horizontal");
  }, [scrollTarget]);

  useEffect(() => {
    if (!scrollTarget) {
      return;
    }

    let frameId: number | undefined;
    const observedChildren = new Set<Element>();
    const scheduleRefresh = () => {
      if (frameId !== undefined) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;
        refresh();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleRefresh);
    const observeChildren = () => {
      const children = Array.from(scrollTarget.children);

      observedChildren.forEach((child) => {
        if (!children.includes(child)) {
          resizeObserver.unobserve(child);
          observedChildren.delete(child);
        }
      });
      children.forEach((child) => {
        if (!observedChildren.has(child)) {
          observedChildren.add(child);
          resizeObserver.observe(child);
        }
      });
    };
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      scheduleRefresh();
    });

    refresh();
    resizeObserver.observe(scrollTarget);
    observeChildren();
    mutationObserver.observe(scrollTarget, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();

      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [refresh, scrollTarget]);

  useEffect(() => {
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];

    if (!scrollTarget) {
      return;
    }

    type ScrollTimelineConstructor = new (options: {
      axis: "block" | "inline";
      source: Element;
    }) => AnimationTimeline;
    const ScrollTimelineClass = (window as Window & {
      ScrollTimeline?: ScrollTimelineConstructor;
    }).ScrollTimeline;

    if (!ScrollTimelineClass) {
      return;
    }

    const connect = (
      axis: OverlayScrollbarAxis,
      thumb: HTMLSpanElement | null,
      transform: string,
    ) => {
      if (!thumb) {
        return;
      }

      const animation = thumb.animate(
        [{ transform: "translate(0, 0)" }, { transform }],
        { duration: 1, fill: "both" },
      );
      (animation as Animation & { timeline: AnimationTimeline }).timeline =
        new ScrollTimelineClass({
          axis: axis === "vertical" ? "block" : "inline",
          source: scrollTarget,
        });
      animationsRef.current.push(animation);
    };

    connect(
      "vertical",
      verticalThumbRef.current,
      "translateY(var(--storage-overlay-vertical-thumb-travel, 0px))",
    );
    if (horizontal) {
      connect(
        "horizontal",
        horizontalThumbRef.current,
        "translateX(var(--storage-overlay-horizontal-thumb-travel, 0px))",
      );
    }

    return () => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
    };
  }, [horizontal, scrollTarget]);

  const getTrackAndThumb = useCallback((axis: OverlayScrollbarAxis) => {
    return axis === "vertical"
      ? { thumb: verticalThumbRef.current, track: verticalTrackRef.current }
      : { thumb: horizontalThumbRef.current, track: horizontalTrackRef.current };
  }, []);

  const scrollTo = useCallback(
    (axis: OverlayScrollbarAxis, offset: number) => {
      if (!scrollTarget) {
        return;
      }

      scrollTarget.scrollTo(axis === "vertical" ? { top: offset } : { left: offset });
    },
    [scrollTarget],
  );

  const handlePointerDown = useCallback(
    (axis: OverlayScrollbarAxis, event: PointerEvent<HTMLButtonElement>) => {
      const { thumb, track } = getTrackAndThumb(axis);

      if (!scrollTarget || !thumb || !track) {
        return;
      }

      const { maxOffset } = getAxisMetrics(scrollTarget, axis);
      const trackSize = axis === "vertical" ? track.clientHeight : track.clientWidth;
      const thumbSize = axis === "vertical" ? thumb.clientHeight : thumb.clientWidth;
      const trackTravel = trackSize - thumbSize;

      if (maxOffset <= 0 || trackTravel <= 0) {
        return;
      }

      const pointerPosition = axis === "vertical" ? event.clientY : event.clientX;
      const currentOffset = axis === "vertical" ? scrollTarget.scrollTop : scrollTarget.scrollLeft;
      const targetIsThumb = thumb.contains(event.target as Node);
      let nextOffset = currentOffset;

      if (!targetIsThumb) {
        const trackBounds = track.getBoundingClientRect();
        const trackStart = axis === "vertical" ? trackBounds.top : trackBounds.left;
        nextOffset = Math.max(
          0,
          Math.min(
            maxOffset,
            ((pointerPosition - trackStart - thumbSize / 2) / trackTravel) * maxOffset,
          ),
        );
        scrollTo(axis, nextOffset);
      }

      dragRef.current = {
        axis,
        maxOffset,
        pointerId: event.pointerId,
        scrollTarget,
        startOffset: nextOffset,
        startPointerPosition: pointerPosition,
        trackTravel,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [getTrackAndThumb, scrollTarget, scrollTo],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      const pointerPosition = drag.axis === "vertical" ? event.clientY : event.clientX;
      const nextOffset = Math.max(
        0,
        Math.min(
          drag.maxOffset,
          drag.startOffset +
            ((pointerPosition - drag.startPointerPosition) / drag.trackTravel) *
              drag.maxOffset,
        ),
      );

      drag.scrollTarget.scrollTo(
        drag.axis === "vertical" ? { top: nextOffset } : { left: nextOffset },
      );
    },
    [],
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      dragRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (axis: OverlayScrollbarAxis, event: KeyboardEvent<HTMLButtonElement>) => {
      if (!scrollTarget) {
        return;
      }

      const { maxOffset, viewportSize } = getAxisMetrics(scrollTarget, axis);
      const currentOffset =
        axis === "vertical" ? scrollTarget.scrollTop : scrollTarget.scrollLeft;
      const step = Math.max(40, Math.round(viewportSize * 0.1));
      const pageStep = Math.max(step, Math.round(viewportSize * 0.9));
      const isVertical = axis === "vertical";
      let nextOffset: number | null = null;

      switch (event.key) {
        case isVertical ? "ArrowDown" : "ArrowRight":
          nextOffset = currentOffset + step;
          break;
        case isVertical ? "ArrowUp" : "ArrowLeft":
          nextOffset = currentOffset - step;
          break;
        case "PageDown":
          nextOffset = currentOffset + pageStep;
          break;
        case "PageUp":
          nextOffset = currentOffset - pageStep;
          break;
        case "Home":
          nextOffset = 0;
          break;
        case "End":
          nextOffset = maxOffset;
          break;
        default:
          return;
      }

      event.preventDefault();
      scrollTo(axis, Math.max(0, Math.min(maxOffset, nextOffset)));
    },
    [scrollTarget, scrollTo],
  );

  return (
    <div
      className="storage-overlay-scrollbar-host pointer-events-none absolute inset-0 z-10"
      ref={hostRef}
    >
      {vertical ? (
        <button
          className="storage-overlay-scrollbar-rail storage-overlay-scrollbar-vertical"
          aria-label="Drag vertical scrollbar"
          onKeyDown={(event) => handleKeyDown("vertical", event)}
          onPointerCancel={handlePointerEnd}
          onPointerDown={(event) => handlePointerDown("vertical", event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          ref={verticalTrackRef}
          type="button"
        >
          <span
            className="storage-overlay-scrollbar-thumb storage-overlay-scrollbar-vertical-thumb"
            ref={verticalThumbRef}
          />
        </button>
      ) : null}
      {horizontal ? (
        <button
          className="storage-overlay-scrollbar-rail storage-overlay-scrollbar-horizontal"
          aria-label="Drag horizontal scrollbar"
          onKeyDown={(event) => handleKeyDown("horizontal", event)}
          onPointerCancel={handlePointerEnd}
          onPointerDown={(event) => handlePointerDown("horizontal", event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          ref={horizontalTrackRef}
          type="button"
        >
          <span
            className="storage-overlay-scrollbar-thumb storage-overlay-scrollbar-horizontal-thumb"
            ref={horizontalThumbRef}
          />
        </button>
      ) : null}
    </div>
  );
}

export function OverlayScrollArea({
  children,
  className,
  horizontal = false,
  vertical = true,
  viewportClassName,
  viewportProps,
  ...props
}: OverlayScrollAreaProps) {
  const [scrollTarget, setScrollTarget] = useState<HTMLDivElement | null>(null);

  return (
    <div
      className={cn("storage-overlay-scrollbar-container relative min-h-0 min-w-0", className)}
      {...props}
    >
      <div
        {...viewportProps}
        className={cn(
          "storage-overlay-scrollbar-viewport h-full min-h-0 min-w-0",
          vertical && "overflow-y-auto",
          horizontal && "overflow-x-auto",
          viewportClassName,
          viewportProps?.className,
        )}
        ref={setScrollTarget}
      >
        {children}
      </div>
      <OverlayScrollbar
        horizontal={horizontal}
        scrollTarget={scrollTarget}
        vertical={vertical}
      />
    </div>
  );
}

export function OverlayScrollbarHost({
  children,
  className,
  horizontal = false,
  horizontalTargetSelector,
  targetSelector,
  ...props
}: OverlayScrollbarHostProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [scrollTarget, setScrollTarget] = useState<HTMLElement | null>(null);
  const [horizontalScrollTarget, setHorizontalScrollTarget] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!host) {
      return;
    }

    let frameId: number | undefined;
    const resolveTarget = () => {
      frameId = undefined;
      const nextTarget = host.querySelector<HTMLElement>(targetSelector);
      const nextHorizontalTarget = horizontal
        ? host.querySelector<HTMLElement>(
            horizontalTargetSelector ?? targetSelector,
          )
        : null;

      setScrollTarget((currentTarget) =>
        currentTarget === nextTarget ? currentTarget : nextTarget,
      );
      setHorizontalScrollTarget((currentTarget) =>
        currentTarget === nextHorizontalTarget
          ? currentTarget
          : nextHorizontalTarget,
      );
    };
    const scheduleResolve = () => {
      if (frameId === undefined) {
        frameId = window.requestAnimationFrame(resolveTarget);
      }
    };
    const observer = new MutationObserver(scheduleResolve);

    resolveTarget();
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      observer.disconnect();

      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [horizontal, horizontalTargetSelector, host, targetSelector]);

  useEffect(() => {
    const targets = [
      scrollTarget,
      horizontal ? horizontalScrollTarget : null,
    ].filter((target): target is HTMLElement => target !== null);

    if (!targets.length) {
      return;
    }

    targets.forEach((target) => {
      target.classList.add("storage-overlay-scrollbar-viewport");
    });

    return () => {
      targets.forEach((target) => {
        target.classList.remove("storage-overlay-scrollbar-viewport");
      });
    };
  }, [horizontal, horizontalScrollTarget, scrollTarget]);

  return (
    <div
      className={cn("storage-overlay-scrollbar-container relative min-h-0 min-w-0", className)}
      ref={setHost}
      {...props}
    >
      {children}
      <OverlayScrollbar scrollTarget={scrollTarget} />
      {horizontal ? (
        <OverlayScrollbar
          horizontal
          scrollTarget={horizontalScrollTarget}
          vertical={false}
        />
      ) : null}
    </div>
  );
}
