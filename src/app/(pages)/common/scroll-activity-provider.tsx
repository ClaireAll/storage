"use client";

import { useEffect } from "react";

const verticalScrollActiveClassName = "storage-is-vertically-scrolling";
const overlayScrollbarActiveClassName = "storage-overlay-scrollbar-active";
const sharedBackgroundPausedClassName = "storage-scroll-background-paused";
const sharedBackgroundPauseSelector = "[data-scroll-pauses-background]";
const overlayScrollbarContainerSelector = ".storage-overlay-scrollbar-container";
const scrollActivityRetentionMs = 2_000;

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
    let activeOverlayScrollbarContainer: HTMLElement | null = null;
    let isSharedBackgroundPaused = false;
    let timer: number | undefined;
    const supportsScrollEnd = "onscrollend" in window;

    const setSharedBackgroundPaused = (isPaused: boolean) => {
      if (isSharedBackgroundPaused === isPaused) {
        return;
      }

      isSharedBackgroundPaused = isPaused;
      document.documentElement.classList.toggle(
        sharedBackgroundPausedClassName,
        isPaused,
      );
    };

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const clearVerticallyScrolling = () => {
      clearTimer();

      activeScrollContainer?.classList.remove(verticalScrollActiveClassName);
      activeScrollContainer = null;
      activeOverlayScrollbarContainer?.classList.remove(
        overlayScrollbarActiveClassName,
      );
      activeOverlayScrollbarContainer = null;
      setSharedBackgroundPaused(false);
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
        clearTimer();

        if (!supportsScrollEnd) {
          scheduleClear();
        }

        return;
      }

      clearTimer();

      if (activeScrollContainer) {
        activeScrollContainer.classList.remove(verticalScrollActiveClassName);
      }

      activeOverlayScrollbarContainer?.classList.remove(
        overlayScrollbarActiveClassName,
      );

      activeScrollContainer = nextScrollContainer;
      activeScrollContainer.classList.add(verticalScrollActiveClassName);
      activeOverlayScrollbarContainer = nextScrollContainer.closest(
        overlayScrollbarContainerSelector,
      );
      activeOverlayScrollbarContainer?.classList.add(
        overlayScrollbarActiveClassName,
      );
      setSharedBackgroundPaused(
        nextScrollContainer.closest(sharedBackgroundPauseSelector) !== null,
      );

      if (!supportsScrollEnd) {
        scheduleClear();
      }
    };

    const handleScroll = (event: Event) => {
      markVerticallyScrolling(event.target);
    };

    const handleScrollEnd = (event: Event) => {
      if (getScrollContainer(event.target) === activeScrollContainer) {
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
