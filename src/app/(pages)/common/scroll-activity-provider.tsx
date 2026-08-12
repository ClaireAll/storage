"use client";

import { useEffect } from "react";

const verticalScrollActiveClassName = "storage-is-vertically-scrolling";
const scrollActivityRetentionMs = 2_000;
const frostResumeDelayMs = 160;

export const scrollActivityChangeEventName = "storage-scroll-activity-change";

export type ScrollActivityChangeDetail = {
  isScrolling: boolean;
};

function getScrollContainer(target: EventTarget | null) {
  if (target instanceof HTMLElement) {
    return target;
  }

  const root = document.scrollingElement;

  return root instanceof HTMLElement ? root : null;
}

export function ScrollActivityProvider() {
  useEffect(() => {
    let activeScrollContainer: HTMLElement | null = null;
    let timer: number | undefined;
    let frostResumeTimer: number | undefined;
    let isFrostPaused = false;
    const supportsScrollEnd = "onscrollend" in window;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const clearFrostResumeTimer = () => {
      if (frostResumeTimer !== undefined) {
        window.clearTimeout(frostResumeTimer);
        frostResumeTimer = undefined;
      }
    };

    const setFrostPaused = (isPaused: boolean) => {
      if (isFrostPaused === isPaused) {
        return;
      }

      isFrostPaused = isPaused;
      window.dispatchEvent(
        new CustomEvent<ScrollActivityChangeDetail>(
          scrollActivityChangeEventName,
          { detail: { isScrolling: isPaused } },
        ),
      );
    };

    const scheduleFrostResume = () => {
      clearFrostResumeTimer();

      frostResumeTimer = window.setTimeout(() => {
        frostResumeTimer = undefined;
        setFrostPaused(false);
      }, frostResumeDelayMs);
    };

    const clearVerticallyScrolling = () => {
      clearTimer();
      clearFrostResumeTimer();
      setFrostPaused(false);

      activeScrollContainer?.classList.remove(verticalScrollActiveClassName);
      activeScrollContainer = null;
    };

    const scheduleClear = () => {
      clearTimer();

      timer = window.setTimeout(() => {
        clearVerticallyScrolling();
      }, scrollActivityRetentionMs);
    };

    const markVerticallyScrolling = (target: EventTarget | null) => {
      const nextScrollContainer = getScrollContainer(target);

      if (!nextScrollContainer) {
        clearVerticallyScrolling();
        return;
      }

      if (activeScrollContainer === nextScrollContainer) {
        setFrostPaused(true);
        scheduleFrostResume();

        if (!supportsScrollEnd) {
          scheduleClear();
        }

        return;
      }

      clearTimer();

      if (activeScrollContainer) {
        activeScrollContainer.classList.remove(verticalScrollActiveClassName);
      }

      activeScrollContainer = nextScrollContainer;
      activeScrollContainer.classList.add(verticalScrollActiveClassName);
      setFrostPaused(true);
      scheduleFrostResume();

      if (!supportsScrollEnd) {
        scheduleClear();
      }
    };

    const handleScroll = (event: Event) => {
      markVerticallyScrolling(event.target);
    };

    const handleScrollEnd = (event: Event) => {
      if (getScrollContainer(event.target) === activeScrollContainer) {
        clearFrostResumeTimer();
        setFrostPaused(false);
        scheduleClear();
      }
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.target instanceof HTMLIFrameElement) {
        clearVerticallyScrolling();
      }
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scrollend", handleScrollEnd, {
      capture: true,
      passive: true,
    });
    window.addEventListener("pointerover", handlePointerOver, {
      capture: true,
      passive: true,
    });

    return () => {
      clearVerticallyScrolling();
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("scrollend", handleScrollEnd, {
        capture: true,
      });
      window.removeEventListener("pointerover", handlePointerOver, {
        capture: true,
      });
    };
  }, []);

  return null;
}
