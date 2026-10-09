"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Card } from "@/features/mediaCalendar/types";
export type DragVisual = {
  post: Card;
  x: number;
  y: number;
  width: number;
  target: string | null;
  dropping: boolean;
};
/** Pointer sensor keeps the real card visible on mouse, pen, and touch handles. */
export function useCalendarDrag(
  onDrop: (id: string, date: string | null) => void,
  onActive: (active: boolean) => void,
) {
  const [visual, setVisual] = useState<DragVisual | null>(null);
  const dispose = useRef<() => void>(() => {}),
    suppressUntil = useRef(0);
  const dropRef = useRef(onDrop),
    activeRef = useRef(onActive);
  useEffect(() => {
    dropRef.current = onDrop;
    activeRef.current = onActive;
  }, [onDrop, onActive]);
  useEffect(() => () => dispose.current(), []);
  const pickUp = (e: ReactPointerEvent<HTMLElement>, post: Card) => {
    if (e.button !== 0 || post.status === "posted") return;
    // A dedicated handle leaves normal touch scrolling available on the card.
    if (
      e.pointerType === "touch" &&
      !(e.target as HTMLElement).closest(".mc-card-grip")
    )
      return;
    dispose.current();
    const source = e.currentTarget.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY },
      offset = { x: e.clientX - source.left, y: e.clientY - source.top };
    const width = Math.min(260, Math.max(180, source.width));
    let pointer = { ...start },
      active = false,
      target: string | null = null,
      frame = 0,
      timer: ReturnType<typeof setTimeout> | undefined;
    let lastX = -1,
      lastY = -1,
      lastTarget: string | null | undefined;
    const oldSelect = document.body.style.userSelect,
      oldCursor = document.body.style.cursor;
    const remove = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("keydown", key);
      document.body.style.userSelect = oldSelect;
      document.body.style.cursor = oldCursor;
    };
    const cleanup = () => {
      remove();
      if (active) {
        setVisual(null);
        activeRef.current(false);
      }
    };
    const paint = () => {
      if (!active) return;
      const under = document.elementFromPoint(pointer.x, pointer.y);
      const zone = under?.closest<HTMLElement>("[data-drop-day]");
      target = zone ? zone.dataset.dropDay || "unscheduled" : null;
      const x = pointer.x - Math.min(offset.x, width - 20),
        y = pointer.y - offset.y;
      if (x !== lastX || y !== lastY || target !== lastTarget) {
        setVisual({
          post,
          x,
          y,
          width,
          target,
          dropping: false,
        });
        lastX = x;
        lastY = y;
        lastTarget = target;
      }
      // Scroll whichever calendar/page container owns the area under the pointer.
      let scroller = under?.parentElement;
      while (scroller && scroller !== document.body) {
        if (
          scroller.scrollHeight > scroller.clientHeight &&
          /auto|scroll/.test(getComputedStyle(scroller).overflowY)
        )
          break;
        scroller = scroller.parentElement;
      }
      const bounds = scroller?.getBoundingClientRect();
      const top = bounds?.top ?? 0,
        bottom = bounds?.bottom ?? window.innerHeight;
      const delta =
        pointer.y < top + 48 ? -12 : pointer.y > bottom - 48 ? 12 : 0;
      if (delta) {
        if (scroller && scroller !== document.body) scroller.scrollBy(0, delta);
        else window.scrollBy(0, delta);
      }
      frame = requestAnimationFrame(paint);
    };
    function move(event: PointerEvent) {
      if (event.pointerId !== e.pointerId) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (
        !active &&
        Math.hypot(pointer.x - start.x, pointer.y - start.y) >= 7
      ) {
        active = true;
        activeRef.current(true);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
        frame = requestAnimationFrame(paint);
      }
      if (active) event.preventDefault();
    }
    function finish(commit: boolean) {
      if (!active) {
        remove();
        return;
      }
      suppressUntil.current = Date.now() + 500;
      remove();
      const zone = commit
        ? document
            .elementFromPoint(pointer.x, pointer.y)
            ?.closest<HTMLElement>("[data-drop-day]")
        : null;
      const destination = zone?.dataset.dropDay || null;
      const bounds = zone?.getBoundingClientRect();
      setVisual({
        post,
        x: bounds ? bounds.left + 8 : source.left,
        y: bounds ? bounds.top + 42 : source.top,
        width,
        target: zone ? (destination ?? "unscheduled") : null,
        dropping: true,
      });
      timer = setTimeout(
        () => {
          setVisual(null);
          activeRef.current(false);
          if (zone && commit) dropRef.current(post.id, destination);
        },
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 170,
      );
      dispose.current = () => {
        clearTimeout(timer);
        setVisual(null);
        activeRef.current(false);
      };
    }
    function up(event: PointerEvent) {
      if (event.pointerId === e.pointerId) {
        pointer = { x: event.clientX, y: event.clientY };
        finish(true);
      }
    }
    function cancel() {
      finish(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancel();
      }
    }
    dispose.current = cleanup;
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("keydown", key);
  };
  return {
    visual,
    pickUp,
    suppressClick: () => Date.now() < suppressUntil.current,
  };
}
