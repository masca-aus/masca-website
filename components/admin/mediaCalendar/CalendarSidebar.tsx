"use client";
import { useEffect, useRef } from "react";
import {
  CalendarDays,
  UserRound,
  ClipboardCheck,
  Lightbulb,
  Plus,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import type { Card, Category, Member } from "@/features/mediaCalendar/types";
import { CalendarSelect } from "./CalendarSelect";
import { statusLabels } from "./CalendarCard";
export type CalendarScope = "all" | "mine" | "review" | "ideas";
export function CalendarSidebar({
  scope,
  category,
  owner,
  format,
  status,
  search,
  posts,
  categories,
  members,
  userId,
  editable,
  mobileOpen,
  onClose,
  onScope,
  onCategory,
  onOwner,
  onFormat,
  onStatus,
  onSearch,
  onClear,
  onAddType,
  onEditTypes,
}: {
  scope: CalendarScope;
  category: string;
  owner: string;
  format: string;
  status: string;
  search: string;
  posts: Card[];
  categories: Category[];
  members: Member[];
  userId: string;
  editable: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onScope: (v: CalendarScope) => void;
  onCategory: (v: string) => void;
  onOwner: (v: string) => void;
  onFormat: (v: string) => void;
  onStatus: (v: string) => void;
  onSearch: (v: string) => void;
  onClear: () => void;
  onAddType: () => void;
  onEditTypes: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current
      ?.querySelector<HTMLElement>("button")
      ?.focus({ preventScroll: true });
    const breakpoint = window.matchMedia("(max-width: 1099px)");
    const checkBreakpoint = () => {
      if (!breakpoint.matches) closeRef.current();
    };
    breakpoint.addEventListener?.("change", checkBreakpoint);
    if (!breakpoint.matches) queueMicrotask(checkBreakpoint);
    return () => {
      breakpoint.removeEventListener?.("change", checkBreakpoint);
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);
  const shortcuts = [
    {
      value: "all",
      label: "All posts",
      icon: CalendarDays,
      count: posts.length,
    },
    {
      value: "mine",
      label: "My posts",
      icon: UserRound,
      count: posts.filter((p) => p.owner === userId).length,
    },
    {
      value: "review",
      label: "Needs approval",
      icon: ClipboardCheck,
      count: posts.filter((p) => p.status === "in_review").length,
    },
    {
      value: "ideas",
      label: "Unscheduled ideas",
      icon: Lightbulb,
      count: posts.filter((p) => !p.plannedAt && p.status !== "posted").length,
    },
  ] as const;
  return (
    <>
      {mobileOpen && (
        <button
          className="mc-sidebar-backdrop"
          aria-label="Close calendar filters"
          onClick={onClose}
        />
      )}
      <aside
        ref={panel}
        className={`mc-sidebar ${mobileOpen ? "mc-sidebar--open" : ""}`}
        role={mobileOpen ? "dialog" : "navigation"}
        aria-modal={mobileOpen || undefined}
        aria-label="Calendar planning"
        onKeyDown={(e) => {
          if (!mobileOpen) return;
          if (e.key === "Escape" && !e.defaultPrevented) {
            e.preventDefault();
            onClose();
          }
          if (e.key === "Tab") {
            const buttons = Array.from(
              panel.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,summary,[tabindex="0"]',
              ) ?? [],
            ).filter((el) => el.offsetParent !== null);
            const first = buttons[0],
              last = buttons.at(-1);
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
        <header className="mc-sidebar-platform">
          <span className="mc-instagram-mark">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.7" fill="currentColor" />
            </svg>
          </span>
          <div>
            <strong>Instagram</strong>
            <small>National media team</small>
          </div>
          <button
            className="mc-sidebar-close"
            aria-label="Close calendar filters"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <label className="mc-sidebar-search">
          <Search size={15} />
          <input
            aria-label="Search posts"
            placeholder="Search posts"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
        <div className="mc-sidebar-shortcuts">
          {shortcuts.map(({ value, label, icon: Icon, count }) => (
            <button
              key={value}
              aria-label={label}
              aria-pressed={scope === value}
              onClick={() => onScope(value)}
            >
              <Icon size={16} />
              <span>{label}</span>
              <small aria-hidden="true">{count}</small>
            </button>
          ))}
        </div>
        <section className="mc-sidebar-types" aria-label="Content types">
          <header>
            <h2>Content types</h2>
            {editable && (
              <button
                aria-label="Add content type"
                title="Add content type"
                onClick={onAddType}
              >
                <Plus size={16} />
              </button>
            )}
          </header>
          <button
            aria-label="Filter by all content types"
            aria-pressed={category === "all"}
            onClick={() => onCategory("all")}
          >
            <i className="mc-type-all" />
            <span>All types</span>
          </button>
          {categories
            .filter((c) => !c.archived)
            .map((c) => (
              <button
                key={c.id}
                aria-label={`Filter by ${c.name}`}
                aria-pressed={category === c.id}
                onClick={() => onCategory(category === c.id ? "all" : c.id)}
              >
                <i className="mc-color-dot" style={{ background: c.color }} />
                <span>{c.name}</span>
              </button>
            ))}
          {editable && (
            <button className="mc-types-edit" onClick={onEditTypes}>
              <SlidersHorizontal size={14} />
              <span>Edit content types</span>
            </button>
          )}
        </section>
        <details className="mc-sidebar-more">
          <summary>
            More filters <ChevronDown size={14} />
          </summary>
          <div>
            <label>
              <span>Status</span>
              <CalendarSelect
                label="Filter status"
                value={status}
                onChange={onStatus}
                options={[
                  { value: "all", label: "All statuses" },
                  ...Object.entries(statusLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                  { value: "hold", label: "On hold" },
                ]}
              />
            </label>
            <label>
              <span>Assigned to</span>
              <CalendarSelect
                label="Filter teammate"
                value={owner}
                onChange={onOwner}
                options={[
                  { value: "all", label: "Everyone" },
                  ...members.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
            </label>
            <label>
              <span>Format</span>
              <CalendarSelect
                label="Filter format"
                value={format}
                onChange={onFormat}
                options={[
                  { value: "all", label: "All formats" },
                  { value: "feed", label: "Feed posts" },
                  { value: "carousel", label: "Carousels" },
                  { value: "reel", label: "Reels" },
                  { value: "story", label: "Stories" },
                ]}
              />
            </label>
          </div>
        </details>
        <button className="mc-sidebar-reset" onClick={onClear}>
          Clear filters
        </button>
        <p className="mc-sidebar-help">
          Click a date to plan a post. Use New post to start an idea without a
          date.
        </p>
        {mobileOpen && (
          <button className="mc-primary mc-sidebar-done" onClick={onClose}>
            Show posts
          </button>
        )}
      </aside>
    </>
  );
}
