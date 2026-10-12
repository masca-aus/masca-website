"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import {
  addDays,
  calendarDays,
  dayKey,
  localInput,
  TIMEZONE,
  toInstant,
} from "@/features/mediaCalendar/dates";

const dateLabel = (day: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
function monthShift(day: string, n: number) {
  const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
export function CalendarDatePicker({
  label,
  value,
  onChange,
  disabled,
  dateOnly = false,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  dateOnly?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = !!anchor;
  const trigger = useRef<HTMLButtonElement>(null);
  const display = value
    ? dateOnly
      ? dateLabel(value)
      : new Intl.DateTimeFormat("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: TIMEZONE,
        }).format(new Date(value))
    : "Choose a date";
  return (
    <div className="mc-date-field">
      <button
        type="button"
        className="mc-date-trigger"
        ref={trigger}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => setAnchor(open ? null : e.currentTarget)}
      >
        <CalendarDays size={16} />
        <span>{display}</span>
      </button>
      {anchor && (
        <DatePopover
          anchor={anchor}
          value={value}
          dateOnly={dateOnly}
          onClose={(focus = true) => {
            setAnchor(null);
            if (focus) trigger.current?.focus();
          }}
          onApply={(next) => {
            onChange(next);
            setAnchor(null);
            trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}
function DatePopover({
  anchor,
  value,
  dateOnly,
  onApply,
  onClose,
}: {
  anchor: HTMLElement;
  value: string | null;
  dateOnly: boolean;
  onApply: (value: string | null) => void;
  onClose: (focus?: boolean) => void;
}) {
  const initial = value
    ? dateOnly
      ? value
      : localInput(value).slice(0, 10)
    : dayKey(new Date().toISOString());
  const [selected, setSelected] = useState(initial),
    [focusDay, setFocusDay] = useState(initial),
    [month, setMonth] = useState(initial),
    [time, setTime] = useState(
      value && !dateOnly ? localInput(value).slice(11) : "18:00",
    ),
    [error, setError] = useState("");
  const picker = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    visibility: "hidden" as "hidden" | "visible",
  });
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });
  useLayoutEffect(() => {
    const box = picker.current!.getBoundingClientRect(),
      rect = anchor.getBoundingClientRect();
    setPosition({
      left: Math.max(
        12,
        Math.min(rect.left, window.innerWidth - box.width - 12),
      ),
      top: Math.max(
        12,
        rect.bottom + box.height + 8 > window.innerHeight
          ? rect.top - box.height - 8
          : rect.bottom + 8,
      ),
      visibility: "visible",
    });
    const outside = (e: PointerEvent) => {
      if (
        !picker.current?.contains(e.target as Node) &&
        !anchor.contains(e.target as Node)
      )
        closeRef.current(false);
    };
    const dismiss = (e: Event) => {
      if (!(e.target instanceof Node) || !picker.current?.contains(e.target))
        closeRef.current(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [anchor]);
  useLayoutEffect(() => {
    if (position.visibility !== "visible") return;
    picker.current
      ?.querySelector<HTMLElement>(`[data-date="${focusDay}"]`)
      ?.focus({ preventScroll: true });
    const frame = window.requestAnimationFrame?.(() =>
      picker.current
        ?.querySelector<HTMLElement>(`[data-date="${focusDay}"]`)
        ?.focus({ preventScroll: true }),
    );
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [focusDay, position.visibility]);
  const navigate = (day: string) => {
    setMonth(day);
    setFocusDay(day);
  };
  return createPortal(
    <div
      ref={picker}
      className="mc-date-popover"
      style={position}
      role="dialog"
      aria-label={dateOnly ? "Choose deadline" : "Choose publishing date"}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if (e.key === "Tab") {
          const nodes = Array.from(
            picker.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled):not([tabindex="-1"]),input:not(:disabled)',
            ),
          );
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <header>
        <strong aria-live="polite">
          {new Intl.DateTimeFormat("en-AU", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${month}T12:00:00Z`))}
        </strong>
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => navigate(monthShift(month, -1))}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => navigate(monthShift(month, 1))}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          aria-label="Close date picker"
          onClick={() => onClose()}
        >
          <X size={15} />
        </button>
      </header>
      <div className="mc-date-weekdays" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mc-date-days" key={month.slice(0, 7)}>
        {calendarDays(month, "month").map((day) => (
          <button
            type="button"
            key={day}
            data-date={day}
            data-outside={day.slice(0, 7) !== month.slice(0, 7)}
            data-today={day === dayKey(new Date().toISOString())}
            aria-label={dateLabel(day)}
            aria-pressed={selected === day}
            tabIndex={focusDay === day ? 0 : -1}
            onClick={() => {
              setSelected(day);
              setFocusDay(day);
              setMonth(day);
            }}
            onKeyDown={(e) => {
              const offsets: Record<string, number> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
              };
              if (e.key in offsets) {
                e.preventDefault();
                navigate(addDays(day, offsets[e.key]));
              } else if (e.key === "PageUp" || e.key === "PageDown") {
                e.preventDefault();
                navigate(monthShift(day, e.key === "PageUp" ? -1 : 1));
              } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                const offset =
                  (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
                navigate(addDays(day, e.key === "Home" ? -offset : 6 - offset));
              }
            }}
          >
            {Number(day.slice(-2))}
          </button>
        ))}
      </div>
      {!dateOnly && (
        <label className="mc-date-time">
          <Clock size={15} />
          <span>Time · AEST</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Time in Brisbane"
            placeholder="HH:MM"
            maxLength={5}
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setError("");
            }}
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <footer>
        <button
          type="button"
          onClick={() => {
            const today = dayKey(new Date().toISOString());
            setSelected(today);
            navigate(today);
          }}
        >
          Today
        </button>
        <button type="button" onClick={() => onApply(null)}>
          Clear
        </button>
        <button
          type="button"
          className="mc-primary"
          onClick={() => {
            if (!dateOnly && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
              setError("Use HH:MM, such as 18:30.");
              return;
            }
            onApply(dateOnly ? selected : toInstant(`${selected}T${time}`));
          }}
        >
          Apply date
        </button>
      </footer>
    </div>,
    anchor.closest('[role="dialog"]') ?? document.body,
  );
}
