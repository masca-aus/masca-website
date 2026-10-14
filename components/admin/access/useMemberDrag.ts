"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { CommitteeArea } from "@/features/access/committeePolicy";
export function useMemberDrag(
  onDrop: (personId: string, workspaceId: string, area?: CommitteeArea) => void,
) {
  const callback = useRef(onDrop);
  useEffect(() => {
    callback.current = onDrop;
  }, [onDrop]);
  const pending = useRef<{
      id: string;
      x: number;
      y: number;
      active: boolean;
    } | null>(null),
    suppress = useRef(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
      null,
    ),
    [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const clear = (preserveClick = false) => {
      pending.current = null;
      suppress.current = preserveClick;
      setDrag(null);
      setTarget(null);
      document.body.classList.remove("ag-dragging");
      cancelAnimationFrame(frame);
    };
    const move = (e: globalThis.PointerEvent) => {
      const p = pending.current;
      if (!p) return;
      if (!p.active && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 7) return;
      p.active = true;
      suppress.current = true;
      e.preventDefault();
      document.body.classList.add("ag-dragging");
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setDrag({ id: p.id, x: e.clientX, y: e.clientY });
        const element = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-drop-workspace]");
        setTarget(
          element
            ? `${element.dataset.dropWorkspace}:${element.dataset.dropArea ?? ""}`
            : null,
        );
      });
    };
    const up = (e: globalThis.PointerEvent) => {
      const p = pending.current;
      const element = p?.active
        ? document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-drop-workspace]")
        : null;
      clear(!!p?.active);
      if (p?.active && element?.dataset.dropWorkspace)
        callback.current(
          p.id,
          element.dataset.dropWorkspace,
          element.dataset.dropArea as CommitteeArea | undefined,
        );
      setTimeout(() => {
        suppress.current = false;
      }, 0);
    };
    const cancel = () => clear();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pending.current?.active) {
        e.stopPropagation();
        e.preventDefault();
        clear();
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    document.addEventListener("keydown", key, true);
    return () => {
      clear();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      document.removeEventListener("keydown", key, true);
    };
  }, []);
  return {
    drag,
    target,
    suppressClick: () => suppress.current,
    begin: (e: PointerEvent, id: string) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      pending.current = { id, x: e.clientX, y: e.clientY, active: false };
    },
  };
}
