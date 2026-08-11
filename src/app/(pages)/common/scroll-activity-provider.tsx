"use client";

import { useEffect } from "react";

const verticalScrollActiveClassName = "storage-is-vertically-scrolling";
const scrollActivityRetentionMs = 2_000;
const verticalScrollableOverflowValues = new Set(["auto", "overlay", "scroll"]);

function isVerticallyScrollable(element: HTMLElement, root: HTMLElement) {
  if (element.scrollHeight <= element.clientHeight) {
    return false;
  }

  return (
    element === root ||
    verticalScrollableOverflowValues.has(
      window.getComputedStyle(element).overflowY,
    )
  );
}

function findVerticalScrollContainer(target: EventTarget | null) {
  const root = document.scrollingElement;

  if (!(root instanceof HTMLElement)) {
    return null;
  }

  let currentElement: Element | null = target instanceof Element ? target : root;

  while (currentElement) {
    if (
      currentElement instanceof HTMLElement &&
      isVerticallyScrollable(currentElement, root)
    ) {
      return currentElement;
    }

    if (currentElement === root) {
      break;
    }

    currentElement = currentElement.parentElement;
  }

  return isVerticallyScrollable(root, root) ? root : null;
}

export function ScrollActivityProvider() {
  useEffect(() => {
    let activeScrollContainer: HTMLElement | null = null;
    let activeScrollTarget: EventTarget | null = null;
    let timer: number | undefined;

    const clearVerticallyScrolling = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }

      activeScrollContainer?.classList.remove(verticalScrollActiveClassName);
      activeScrollContainer = null;
      activeScrollTarget = null;
    };

    const refreshScrollRetention = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        clearVerticallyScrolling();
      }, scrollActivityRetentionMs);
    };

    const markVerticallyScrolling = (target: EventTarget | null) => {
      if (activeScrollContainer && activeScrollTarget === target) {
        refreshScrollRetention();
        return;
      }

      const nextScrollContainer = findVerticalScrollContainer(target);

      if (!nextScrollContainer) {
        clearVerticallyScrolling();
        return;
      }

      if (
        activeScrollContainer &&
        activeScrollContainer !== nextScrollContainer
      ) {
        activeScrollContainer.classList.remove(verticalScrollActiveClassName);
      }

      activeScrollContainer = nextScrollContainer;
      activeScrollTarget = target;
      activeScrollContainer.classList.add(verticalScrollActiveClassName);
      refreshScrollRetention();
    };

    const handleScroll = (event: Event) => {
      markVerticallyScrolling(event.target);
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
    window.addEventListener("pointerover", handlePointerOver, {
      capture: true,
      passive: true,
    });

    return () => {
      clearVerticallyScrolling();
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("pointerover", handlePointerOver, {
        capture: true,
      });
    };
  }, []);

  return null;
}
