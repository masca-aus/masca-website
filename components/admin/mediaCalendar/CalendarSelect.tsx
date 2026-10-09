"use client";
import React, { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FloatingMenu } from "./FloatingMenu";
export type SelectOption = { value: string; label: string; color?: string };
export function CalendarSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = !!anchor;
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);
  const close = (focus = true) => {
    setAnchor(null);
    if (focus) trigger.current?.focus();
  };
  return (
    <div className="mc-select">
      <button
        type="button"
        className="mc-select-trigger"
        ref={trigger}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => setAnchor(open ? null : e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setAnchor(e.currentTarget);
          }
        }}
      >
        {selected?.color && (
          <i className="mc-color-dot" style={{ background: selected.color }} />
        )}
        <span>{selected?.label ?? "Choose…"}</span>
        <ChevronDown size={15} />
      </button>
      {anchor && (
        <FloatingMenu
          label={label}
          items={options}
          selected={value}
          anchor={anchor}
          onClose={close}
          onSelect={(v) => {
            onChange(v);
            close();
          }}
        />
      )}
    </div>
  );
}
