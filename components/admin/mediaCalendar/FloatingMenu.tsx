"use client";
import React, {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
export type MenuItem = {
  label: string;
  value: string;
  icon?: ReactNode;
  color?: string;
  disabled?: boolean;
  danger?: boolean;
};
export function FloatingMenu({
  label,
  items,
  selected,
  anchor,
  point,
  onSelect,
  onClose,
}: {
  label: string;
  items: MenuItem[];
  selected?: string;
  anchor: HTMLElement;
  point?: { x: number; y: number };
  onSelect: (value: string) => void;
  onClose: (focus?: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(
    Math.max(
      0,
      items.findIndex((i) => i.value === selected && !i.disabled),
    ),
  );
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    visibility: "hidden" as "hidden" | "visible",
  });
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const search = useRef({ text: "", at: 0 });
  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const box = menu.current!.getBoundingClientRect();
    const x = point?.x ?? rect.left;
    let y = point?.y ?? rect.bottom + 6;
    if (y + box.height > window.innerHeight - 10)
      y = point
        ? window.innerHeight - box.height - 10
        : rect.top - box.height - 6;
    setPosition({
      left: Math.max(10, Math.min(x, window.innerWidth - box.width - 10)),
      top: Math.max(10, y),
      visibility: "visible",
    });
    menu.current!.focus();
    // Let the triggering click complete before settling keyboard focus in the portal.
    const focusFrame = window.requestAnimationFrame?.(() =>
      menu.current?.focus(),
    );
    const outside = (e: PointerEvent) => {
      if (
        !menu.current?.contains(e.target as Node) &&
        !anchor.contains(e.target as Node)
      )
        closeRef.current(false);
    };
    const dismiss = (event: Event) => {
      if (
        !(event.target instanceof Node) ||
        !menu.current?.contains(event.target)
      )
        closeRef.current(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [anchor, point]);
  useLayoutEffect(() => {
    menu.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  const choose = (index: number) => {
    if (!items[index]?.disabled) onSelect(items[index].value);
  };
  return createPortal(
    <div
      className="mc-floating-menu"
      style={position}
      role={selected === undefined ? "menu" : "listbox"}
      aria-label={label}
      tabIndex={-1}
      ref={menu}
      aria-activedescendant={`mc-option-${label.replace(/\W/g, "")}-${active}`}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onClose(true);
        } else if (e.key === "Tab") onClose(true);
        else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const available = items
            .map((item, i) => (item.disabled ? -1 : i))
            .filter((i) => i >= 0);
          const current = available.indexOf(active);
          setActive(
            e.key === "Home"
              ? available[0]
              : e.key === "End"
                ? available.at(-1)!
                : available[
                    (current +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      available.length) %
                      available.length
                  ],
          );
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose(active);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const now = Date.now();
          search.current = {
            text:
              (now - search.current.at < 700 ? search.current.text : "") +
              e.key.toLowerCase(),
            at: now,
          };
          const index = items.findIndex(
            (i) =>
              !i.disabled &&
              i.label.toLowerCase().startsWith(search.current.text),
          );
          if (index >= 0) setActive(index);
        }
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.value}
          id={`mc-option-${label.replace(/\W/g, "")}-${i}`}
          data-index={i}
          role={selected === undefined ? "menuitem" : "option"}
          aria-selected={
            selected === undefined ? undefined : item.value === selected
          }
          aria-disabled={item.disabled || undefined}
          className={`mc-menu-item ${i === active ? "mc-menu-item--active" : ""} ${item.danger ? "mc-menu-item--danger" : ""}`}
          onPointerMove={() => {
            if (!item.disabled) setActive(i);
          }}
          onClick={() => choose(i)}
        >
          {item.icon}
          {item.color && (
            <i className="mc-color-dot" style={{ background: item.color }} />
          )}
          <span>{item.label}</span>
          {selected === item.value && <Check size={15} />}
        </div>
      ))}
    </div>,
    anchor.closest('[role="dialog"]') ?? document.body,
  );
}
