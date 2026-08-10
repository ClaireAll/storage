"use client";

import { useEffect } from "react";

const scrollActiveClassName = "storage-is-scrolling";
const scrollActivityRetentionMs = 2_000;
const scrollKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

export function ScrollActivityProvider() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;

    const markScrolling = () => {
      root.classList.add(scrollActiveClassName);
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        root.classList.remove(scrollActiveClassName);
      }, scrollActivityRetentionMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) {
        markScrolling();
      }
    };

    window.addEventListener("scroll", markScrolling, {
      capture: true,
      passive: true,
    });
    window.addEventListener("wheel", markScrolling, { passive: true });
    window.addEventListener("touchmove", markScrolling, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      root.classList.remove(scrollActiveClassName);
      window.removeEventListener("scroll", markScrolling, { capture: true });
      window.removeEventListener("wheel", markScrolling);
      window.removeEventListener("touchmove", markScrolling);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
