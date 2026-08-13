"use client";

import { cn } from "@/lib/utils";
import {
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

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

export function OverlayScrollArea({
  children,
  className,
  horizontal = false,
  vertical = true,
  viewportClassName,
  viewportProps,
  ...props
}: OverlayScrollAreaProps) {
  return (
    <div
      className={cn("storage-overlay-scrollbar-container min-h-0 min-w-0", className)}
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
      >
        {children}
      </div>
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
      className={cn("storage-overlay-scrollbar-container min-h-0 min-w-0", className)}
      ref={setHost}
      {...props}
    >
      {children}
    </div>
  );
}
