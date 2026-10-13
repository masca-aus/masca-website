"use client";
import { useLayoutEffect, useRef, type RefObject } from "react";
export function useInlineMotion(
  root: RefObject<HTMLElement | null>,
  watch: unknown,
) {
  const previous = useRef(new Map<string, DOMRect>()),
    playing = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    playing.current.forEach((a) => a.cancel());
    playing.current = [];
    const next = new Map<string, DOMRect>();
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const el of root.current?.querySelectorAll<HTMLElement>(
      "[data-motion-key]",
    ) ?? []) {
      const key = el.dataset.motionKey!,
        rect = el.getBoundingClientRect(),
        old = previous.current.get(key);
      next.set(key, rect);
      if (!old || reduced || !el.animate || !rect.width) continue;
      const x = old.left - rect.left,
        y = old.top - rect.top;
      if (Math.abs(x) + Math.abs(y) + Math.abs(old.height - rect.height) < 1)
        continue;
      playing.current.push(
        el.animate(
          [
            {
              transform: `translate(${x}px,${y}px)`,
              height: `${old.height}px`,
            },
            { transform: "none", height: `${rect.height}px` },
          ],
          { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
        ),
      );
    }
    previous.current = next;
  }, [root, watch]);
  useLayoutEffect(() => () => playing.current.forEach((a) => a.cancel()), []);
}
