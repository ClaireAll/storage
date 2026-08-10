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
    let timer: number | undefined;

    const markVerticallyScrolling = (target: EventTarget | null) => {
      const nextScrollContainer = findVerticalScrollContainer(target);

      if (!nextScrollContainer) {
        return;
      }

      if (
        activeScrollContainer &&
        activeScrollContainer !== nextScrollContainer
      ) {
        activeScrollContainer.classList.remove(verticalScrollActiveClassName);
      }

      activeScrollContainer = nextScrollContainer;
      activeScrollContainer.classList.add(verticalScrollActiveClassName);

      if (timer) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(() => {
        activeScrollContainer?.classList.remove(verticalScrollActiveClassName);
        activeScrollContainer = null;
      }, scrollActivityRetentionMs);
    };

    const handleScroll = (event: Event) => {
      markVerticallyScrolling(event.target);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY !== 0) {
        markVerticallyScrolling(event.target);
      }
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      activeScrollContainer?.classList.remove(verticalScrollActiveClassName);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
