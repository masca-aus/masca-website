"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  UserRound,
  ClipboardCheck,
  Lightbulb,
  Plus,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import type { Card, Category, Member } from "@/features/mediaCalendar/types";
import { CalendarSelect } from "./CalendarSelect";
import { ContentTypeRow } from "./ContentTypeRow";
import { InlineContentType } from "./InlineContentType";
import { statusLabels } from "./CalendarCard";
export type CalendarScope = "all" | "mine" | "review" | "ideas";
export function CalendarSidebar({
  scope,
  owningScope,
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
  loading = false,
  mobileOpen,
  onClose,
  onScope,
  onCategory,
  onOwner,
  onFormat,
  onStatus,
  onSearch,
  onClear,
  onTypeCreated,
  onTypeUpdated,
  onTypePurged,
}: {
  scope: CalendarScope;
  owningScope?: import("@/features/access/committeePolicy").CommitteeScope;
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
  loading?: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onScope: (v: CalendarScope) => void;
  onCategory: (v: string) => void;
  onOwner: (v: string) => void;
  onFormat: (v: string) => void;
  onStatus: (v: string) => void;
  onSearch: (v: string) => void;
  onClear: () => void;
  onTypeCreated: (category: Category) => void;
  onTypeUpdated: (category: Category) => void;
  onTypePurged: (id: string) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adding, setAdding] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<Category | null>(null);
  const deletedButton = useRef<HTMLButtonElement>(null);
  const deleted = categories.filter((c) => c.archived);
  const purgeType = (id: string) => {
    onTypePurged(id);
    if (lastDeleted?.id === id) setLastDeleted(null);
    queueMicrotask(() =>
      (deletedButton.current ?? addButton.current)?.focus({
        preventScroll: true,
      }),
    );
  };
  const updateType = (saved: Category) => {
    onTypeUpdated(saved);
    if (saved.archived) {
      setLastDeleted(saved);
      setDeletedOpen(true);
      queueMicrotask(() =>
        deletedButton.current?.focus({ preventScroll: true }),
      );
    } else if (saved.id === lastDeleted?.id) setLastDeleted(null);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  const closeDrawer = () => {
    if (closeTimer.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setClosing(false);
      closeRef.current();
    }, 160);
  };
  const previouslyAdding = useRef(false);
  useEffect(() => {
    if (!adding && previouslyAdding.current)
      addButton.current?.focus({ preventScroll: true });
    previouslyAdding.current = adding;
  }, [adding]);
  const finishAdding = () => setAdding(false);
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
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
        queueMicrotask(() => setClosing(false));
      }
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
          className={`mc-sidebar-backdrop ${closing ? "mc-sidebar-backdrop--closing" : ""}`}
          aria-label="Close calendar filters"
          onClick={closeDrawer}
        />
      )}
      <aside
        ref={panel}
        className={`mc-sidebar ${mobileOpen ? "mc-sidebar--open" : ""} ${closing ? "mc-sidebar--closing" : ""}`}
        role={mobileOpen ? "dialog" : "navigation"}
        aria-modal={mobileOpen || undefined}
        aria-label="Calendar planning"
        onKeyDown={(e) => {
          if (!mobileOpen) return;
          if (e.key === "Escape" && !e.defaultPrevented) {
            e.preventDefault();
            closeDrawer();
          }
          if (e.key === "Tab") {
            const buttons = Array.from(
              panel.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
              ) ?? [],
            ).filter(
              (el) => el.offsetParent !== null && !el.closest("[inert]"),
            );
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
          <span className="mc-instagram-mark" aria-hidden="true">
            <svg
              width="38"
              height="38"
              viewBox="0 0 40 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
            >
              <rect x="9" y="9" width="22" height="22" rx="6.5" />
              <circle cx="20" cy="20" r="5.2" />
              <circle
                cx="27"
                cy="13"
                r="1.45"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </span>
          <div>
            <strong>Instagram</strong>
            <small>{owningScope ?? "National"} media team</small>
          </div>
          <button
            className="mc-sidebar-close"
            aria-label="Close calendar filters"
            onClick={closeDrawer}
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
              <small aria-hidden="true">{loading ? "—" : count}</small>
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
                ref={addButton}
                aria-expanded={adding}
                aria-controls="mc-inline-content-type"
                disabled={adding}
                onClick={() => setAdding(true)}
              >
                <Plus size={16} />
              </button>
            )}
          </header>
          <div
            id="mc-inline-content-type"
            className="mc-inline-type-reveal"
            data-open={adding}
          >
            <div>
              {adding && (
                <InlineContentType
                  owningScope={owningScope}
                  onCancel={finishAdding}
                  onCreated={(saved) => {
                    onTypeCreated(saved);
                    finishAdding();
                  }}
                />
              )}
            </div>
          </div>
          <button
            aria-label="Filter by all content types"
            aria-pressed={category === "all"}
            onClick={() => onCategory("all")}
          >
            <i className="mc-type-all" />
            <span>All types</span>
          </button>
          {loading && (
            <div className="mc-loading-types" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div className="mc-loading-line" key={i} />
              ))}
            </div>
          )}
          {!loading &&
            categories
              .filter((c) => !c.archived)
              .map((c) => (
                <ContentTypeRow
                  key={c.id}
                  category={c}
                  selected={category === c.id}
                  editable={editable}
                  onSelect={() => onCategory(category === c.id ? "all" : c.id)}
                  onSaved={updateType}
                  onPurged={purgeType}
                />
              ))}
          {editable && deleted.length > 0 && (
            <div className="mc-deleted-types" data-open={deletedOpen}>
              <button
                ref={deletedButton}
                className="mc-deleted-types-toggle"
                aria-expanded={deletedOpen}
                aria-controls="mc-deleted-type-list"
                onClick={() => setDeletedOpen(!deletedOpen)}
              >
                <span>
                  Deleted types <small>{deleted.length}</small>
                </span>
                <ChevronDown size={13} />
              </button>
              <div
                className="mc-deleted-types-reveal"
                id="mc-deleted-type-list"
                inert={!deletedOpen}
              >
                <div>
                  {lastDeleted && (
                    <p role="status" className="mc-type-deleted-note">
                      Deleted “{lastDeleted.name}”. Your posts are unchanged.
                    </p>
                  )}
                  {deleted.map((c) => (
                    <ContentTypeRow
                      key={c.id}
                      category={c}
                      selected={false}
                      editable={editable}
                      recent={c.id === lastDeleted?.id}
                      onSelect={() => {}}
                      onSaved={updateType}
                      onPurged={purgeType}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
        <section className="mc-sidebar-more" data-open={moreOpen}>
          <button
            className="mc-sidebar-more-toggle"
            aria-expanded={moreOpen}
            aria-controls="mc-sidebar-extra-filters"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            More filters <ChevronDown size={14} />
          </button>
          <div
            id="mc-sidebar-extra-filters"
            className="mc-sidebar-more-reveal"
            inert={!moreOpen}
          >
            <div className="mc-sidebar-more-content">
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
          </div>
        </section>
        <button className="mc-sidebar-reset" onClick={onClear}>
          Clear filters
        </button>
        <p className="mc-sidebar-help">
          Click a date to plan a post. Use New post to start an idea without a
          date.
        </p>
        {mobileOpen && (
          <button className="mc-primary mc-sidebar-done" onClick={closeDrawer}>
            Show posts
          </button>
        )}
      </aside>
    </>
  );
}
