"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PostPanel } from "./PostPanel";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  SlidersHorizontal,
  Bell,
  Check,
  X,
  Undo2,
} from "lucide-react";
import type {
  Card,
  Category,
  Member,
  CalendarNotification,
  CalendarUser,
  Post,
} from "@/features/mediaCalendar/types";
import { mayUseCalendar } from "@/features/mediaCalendar/policy";
import {
  calendarDays,
  dayKey,
  moveToDay,
  addDays,
  TIMEZONE,
} from "@/features/mediaCalendar/dates";
import { api, calendarAPI } from "./api";
import { CalendarSidebar, type CalendarScope } from "./CalendarSidebar";
import { useCalendarDrag } from "./useCalendarDrag";
import { CalendarCard } from "./CalendarCard";
import { RoomPresence } from "./RoomPresence";
import { CategoryManager } from "./CategoryManager";
import "./calendar.css";
type Overview = {
  posts: Card[];
  categories: Category[];
  members: Member[];
  notifications: CalendarNotification[];
  next: number | null;
};
export function CalendarView({ user }: { user: CalendarUser }) {
  const router = useRouter(),
    query = useSearchParams();
  const postId = query.get("post");
  const [day, setDay] = useState(() => dayKey(new Date().toISOString())),
    [view, setView] = useState<"month" | "week" | "list">("month"),
    [data, setData] = useState<Overview>({
      posts: [],
      categories: [],
      members: [],
      notifications: [],
      next: null,
    }),
    [loading, setLoading] = useState(true),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [search, setSearch] = useState(""),
    [scope, setScope] = useState<CalendarScope>("all"),
    [owner, setOwner] = useState("all"),
    [format, setFormat] = useState("all"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [manage, setManage] = useState<"new" | "edit" | null>(null),
    [notifications, setNotifications] = useState(false),
    [busy, setBusy] = useState<string | null>(null),
    [landed, setLanded] = useState<string | null>(null),
    [notices, setNotices] = useState<
      {
        id: string;
        message: string;
        undo?: { id: string; version: number };
        working?: boolean;
      }[]
    >([]);
  const pending = useRef(false),
    creatingRef = useRef(false);
  const landingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(landingTimer.current), []);
  const cache = useRef(new Map<string, Overview>()),
    epoch = useRef(0),
    dragging = useRef(false),
    editable = mayUseCalendar(user, "edit");
  const days = useMemo(() => calendarDays(day, view), [day, view]);
  const rangeURL = useMemo(
    () =>
      `${calendarAPI}?from=${encodeURIComponent(new Date(`${days[0]}T00:00:00+10:00`).toISOString())}&to=${encodeURIComponent(new Date(`${addDays(days.at(-1)!, 1)}T00:00:00+10:00`).toISOString())}`,
    [days],
  );
  const load = useCallback(
    async (force = false) => {
      const n = ++epoch.current;
      const cached = cache.current.get(rangeURL);
      if (cached && !force) {
        setData(cached);
        setLoading(false);
      } else if (!force) setLoading(true);
      try {
        let result = await api<Overview>(rangeURL);
        while (result.next !== null) {
          const next = await api<Overview>(`${rangeURL}&offset=${result.next}`);
          result = {
            ...result,
            posts: [...result.posts, ...next.posts],
            next: next.next,
          };
        }
        cache.current.set(rangeURL, result);
        if (n === epoch.current) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (n === epoch.current) setError((e as Error).message);
      } finally {
        if (n === epoch.current) setLoading(false);
      }
    },
    [rangeURL],
  );
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) queueMicrotask(() => setView("list"));
  }, []);
  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (!document.hidden && !dragging.current && !pending.current)
        void load(true);
    }, 30000);
    return () => {
      clearInterval(interval);
      epoch.current++;
    };
  }, [load]);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      for (const direction of [-1, 1]) {
        let adjacent: string;
        if (view === "week") adjacent = addDays(day, direction * 7);
        else {
          const date = new Date(`${day.slice(0, 7)}-15T12:00:00Z`);
          date.setUTCMonth(date.getUTCMonth() + direction);
          adjacent = date.toISOString().slice(0, 10);
        }
        const range = calendarDays(adjacent, view);
        const url = `${calendarAPI}?from=${encodeURIComponent(new Date(`${range[0]}T00:00:00+10:00`).toISOString())}&to=${encodeURIComponent(new Date(`${addDays(range.at(-1)!, 1)}T00:00:00+10:00`).toISOString())}`;
        if (!cache.current.has(url))
          void api<Overview>(url)
            .then((result) => {
              if (alive && result.next === null) cache.current.set(url, result);
            })
            .catch(() => {});
      }
    }, 1000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [day, view]);
  const open = (id: string) =>
    router.push(`/admin/media-calendar?post=${id}`, { scroll: false });
  const create = async (date: string | null) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setError("");
    try {
      const result = await api<{ post: Post }>(calendarAPI, {
        action: "create",
        patch: {
          plannedAt: date ? moveToDay(null, date) : null,
          ...(category !== "all" ? { category } : {}),
        },
      });
      cache.current.clear();
      open(result.post.id);
      void load(true);
    } catch (e) {
      setError((e as Error).message);
      creatingRef.current = false;
      setCreating(false);
    }
  };
  useEffect(() => {
    if (postId)
      queueMicrotask(() => {
        creatingRef.current = false;
        setCreating(false);
      });
  }, [postId]);
  const notify = (message: string, undo?: { id: string; version: number }) => {
    const id = crypto.randomUUID();
    setNotices((current) => [
      ...current.filter((n) => n.undo),
      { id, message, undo },
    ]);
  };
  const action = async (p: Card, action: "draft" | "delete") => {
    if (pending.current) return;
    pending.current = true;
    setBusy(p.id);
    setError("");
    try {
      const result = await api<{ post: Post }>(calendarAPI, {
        id: p.id,
        action,
        expectedVersion: p.version,
      });
      cache.current.clear();
      setData((current) => ({
        ...current,
        posts:
          action === "delete"
            ? current.posts.filter((v) => v.id !== p.id)
            : current.posts.map((v) =>
                v.id === p.id
                  ? {
                      ...v,
                      status: result.post.status,
                      version: result.post.version,
                    }
                  : v,
              ),
      }));
      notify(
        action === "delete"
          ? `Deleted “${p.title}”`
          : `“${p.title}” moved to draft`,
        action === "delete"
          ? { id: p.id, version: result.post.version }
          : undefined,
      );
      await load(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };
  const undo = async (notice: (typeof notices)[number]) => {
    if (!notice.undo || pending.current) return;
    pending.current = true;
    setNotices((current) =>
      current.map((n) => (n.id === notice.id ? { ...n, working: true } : n)),
    );
    try {
      await api(calendarAPI, {
        id: notice.undo.id,
        action: "restore",
        expectedVersion: notice.undo.version,
      });
      cache.current.clear();
      await load(true);
      setNotices((current) => current.filter((n) => n.id !== notice.id));
      notify("Post restored");
    } catch (e) {
      setError((e as Error).message);
      setNotices((current) =>
        current.map((n) => (n.id === notice.id ? { ...n, working: false } : n)),
      );
    } finally {
      pending.current = false;
    }
  };
  const move = async (id: string, date: string | null) => {
    const p = data.posts.find((p) => p.id === id);
    if (
      !p ||
      p.status === "posted" ||
      pending.current ||
      (date ? p.plannedAt && dayKey(p.plannedAt) === date : !p.plannedAt)
    )
      return;
    pending.current = true;
    setBusy(id);
    setError("");
    setLanded(id);
    clearTimeout(landingTimer.current);
    landingTimer.current = setTimeout(() => setLanded(null), 550);
    const old = data;
    setData({
      ...data,
      posts: data.posts.map((v) =>
        v.id === id
          ? { ...v, plannedAt: date ? moveToDay(v.plannedAt, date) : null }
          : v,
      ),
    });
    dragging.current = true;
    try {
      await api(calendarAPI, {
        id,
        action: "patch",
        expectedVersion: p.version,
        patch: { plannedAt: date ? moveToDay(p.plannedAt, date) : null },
      });
      cache.current.clear();
      await load(true);
      notify(
        date
          ? `Moved to ${new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: TIMEZONE }).format(new Date(`${date}T12:00:00Z`))}`
          : "Moved to unscheduled",
      );
    } catch (e) {
      setData(old);
      setError((e as Error).message);
    } finally {
      dragging.current = false;
      pending.current = false;
      setBusy(null);
    }
  };
  const drag = useCalendarDrag(
    (id, date) => void move(id, date),
    (active) => {
      dragging.current = active;
    },
  );
  const filtered = data.posts.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (scope !== "mine" || p.owner === String(user.id)) &&
      (scope !== "review" || p.status === "in_review") &&
      (scope !== "ideas" || (!p.plannedAt && p.status !== "posted")) &&
      (owner === "all" || p.owner === owner) &&
      (format === "all" || p.type === format) &&
      (status === "all" ||
        (status === "hold" ? p.onHold : p.status === status)) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );
  const scheduled = filtered.filter((p) => p.plannedAt),
    unscheduled = filtered.filter((p) => !p.plannedAt);
  const clearFilters = () => {
    setScope("all");
    setCategory("all");
    setStatus("all");
    setOwner("all");
    setFormat("all");
    setSearch("");
  };
  const selectScope = (value: CalendarScope) => {
    setScope(value);
    setOwner("all");
    setStatus("all");
    setFiltersOpen(false);
  };
  const filterCount = [
    scope !== "all",
    category !== "all",
    status !== "all",
    owner !== "all",
    format !== "all",
    !!search,
  ].filter(Boolean).length;
  const nav = (direction: number) => {
    if (view === "week") setDay(addDays(day, direction * 7));
    else {
      const d = new Date(`${day.slice(0, 7)}-15T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDay(d.toISOString().slice(0, 10));
    }
  };
  const title = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(`${day}T12:00:00Z`));
  const card = (p: Card) => (
    <CalendarCard
      key={p.id}
      post={p}
      category={data.categories.find((c) => c.id === p.category)}
      editable={editable}
      landed={landed === p.id}
      moving={busy === p.id || drag.visual?.post.id === p.id}
      onPickUp={(e, p) => {
        if (!pending.current) drag.pickUp(e, p);
      }}
      onAction={(a) => void action(p, a)}
      open={() => {
        if (!drag.suppressClick()) open(p.id);
      }}
    />
  );
  return (
    <main
      className="mc-workspace"
      data-dragging={!!drag.visual}
      data-landed={landed ?? undefined}
    >
      <header className="mc-heading">
        <div>
          <span className="mc-eyebrow">MASCA NATIONAL · MEDIA TEAM</span>
          <h1>Media calendar</h1>
          <p>A little planning. A bigger impact.</p>
        </div>
        <div className="mc-heading-actions">
          <RoomPresence />
          <button
            className="mc-notification-button"
            aria-label={`Notifications, ${data.notifications.filter((n) => !n.read).length} unread`}
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={19} />
            {data.notifications.some((n) => !n.read) && <i />}
          </button>
          {editable && (
            <button
              className="mc-primary"
              disabled={creating}
              onClick={() => void create(null)}
            >
              <Plus size={18} />
              New post
            </button>
          )}
        </div>
      </header>
      {notifications && (
        <section className="mc-notifications" aria-label="Notifications">
          <h3>Updates for you</h3>
          {!data.notifications.length && <p>You’re all caught up.</p>}
          {data.notifications.map((n) => (
            <button
              key={n.id}
              data-read={n.read}
              onClick={() => {
                void api(calendarAPI, {
                  action: "notification",
                  id: n.id,
                }).then(() => load(true));
                setNotifications(false);
                open(n.postId);
              }}
            >
              {n.message}
              <small>{new Date(n.createdAt).toLocaleDateString("en-AU")}</small>
            </button>
          ))}
        </section>
      )}
      <div className="mc-calendar-layout">
        <CalendarSidebar
          scope={scope}
          category={category}
          owner={owner}
          format={format}
          status={status}
          search={search}
          posts={data.posts}
          categories={data.categories}
          members={data.members}
          userId={String(user.id)}
          editable={editable}
          mobileOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onScope={selectScope}
          onCategory={setCategory}
          onOwner={(value) => {
            setOwner(value);
            if (scope === "mine") setScope("all");
          }}
          onFormat={setFormat}
          onStatus={(value) => {
            setStatus(value);
            if (scope === "review") setScope("all");
          }}
          onSearch={setSearch}
          onClear={clearFilters}
          onAddType={() => {
            setManage("new");
            setFiltersOpen(false);
          }}
          onEditTypes={() => {
            setManage("edit");
            setFiltersOpen(false);
          }}
        />
        <div className="mc-calendar-main">
          <div className="mc-mobile-filter-row">
            <button
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Filters{filterCount > 0 && <span>{filterCount}</span>}
            </button>
          </div>
          {manage && (
            <CategoryManager
              key={manage}
              startNew={manage === "new"}
              categories={data.categories}
              onClose={() => setManage(null)}
              onUpdate={(saved) => {
                setData((current) => ({
                  ...current,
                  categories: [
                    ...current.categories.filter((c) => c.id !== saved.id),
                    saved,
                  ],
                }));
                if (manage === "new") {
                  setCategory(saved.id);
                  setScope("all");
                  setManage(null);
                } else if (saved.archived && category === saved.id)
                  setCategory("all");
                cache.current.clear();
                void load(true);
              }}
            />
          )}
          {scope !== "ideas" && (
            <section className="mc-calendar-shell">
              <div className="mc-toolbar">
                <div className="mc-month-navigation">
                  <button aria-label="Previous range" onClick={() => nav(-1)}>
                    <ChevronLeft size={19} />
                  </button>
                  <h2>{title}</h2>
                  <button aria-label="Next range" onClick={() => nav(1)}>
                    <ChevronRight size={19} />
                  </button>
                  <button
                    className="mc-today"
                    onClick={() => setDay(dayKey(new Date().toISOString()))}
                  >
                    Today
                  </button>
                </div>
                <div className="mc-view-toggle" aria-label="Calendar view">
                  {(["month", "week", "list"] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                    >
                      {v === "list" ? (
                        <List size={16} />
                      ) : (
                        <CalendarDays size={16} />
                      )}
                      <span>{v[0].toUpperCase() + v.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="mc-calendar-timezone">{TIMEZONE} · AEST</p>
              {error && (
                <div className="mc-error" role="alert">
                  {error}
                  <button onClick={() => void load(true)}>Retry</button>
                </div>
              )}
              {loading && !data.posts.length ? (
                <div className="mc-calendar-loading" role="status">
                  Loading your calendar…
                </div>
              ) : view === "list" ? (
                <div className="mc-list" key={`list-${days[0]}`}>
                  {scheduled.length ? (
                    days
                      .filter((d) =>
                        scheduled.some((p) => dayKey(p.plannedAt!) === d),
                      )
                      .map((d) => (
                        <section
                          key={d}
                          data-drop-day={d}
                          data-drop-active={drag.visual?.target === d}
                        >
                          <h3>
                            {new Intl.DateTimeFormat("en-AU", {
                              weekday: "short",
                              timeZone: TIMEZONE,
                              day: "numeric",
                              month: "short",
                            }).format(new Date(`${d}T12:00:00Z`))}
                          </h3>
                          <div>
                            {scheduled
                              .filter((p) => dayKey(p.plannedAt!) === d)
                              .map(card)}
                          </div>
                          {editable && (
                            <button
                              className="mc-list-add"
                              onClick={() => void create(d)}
                            >
                              <Plus size={15} />
                              Add post
                            </button>
                          )}
                        </section>
                      ))
                  ) : (
                    <div className="mc-empty">
                      <CalendarDays size={32} />
                      <h3>Room for your next idea</h3>
                      <p>Choose a date or start an unscheduled draft.</p>
                      {editable && (
                        <button
                          className="mc-primary"
                          onClick={() => void create(day)}
                        >
                          Create a post
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`mc-grid mc-grid--${view}`}
                  key={`${view}-${days[0]}`}
                >
                  <div className="mc-weekdays">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (d) => (
                        <span key={d}>{d}</span>
                      ),
                    )}
                  </div>
                  <div className="mc-days">
                    {days.map((d) => (
                      <section
                        key={d}
                        onClick={(e) => {
                          if (
                            editable &&
                            !creatingRef.current &&
                            !pending.current &&
                            !drag.suppressClick() &&
                            !(e.target as HTMLElement).closest(
                              "button,.mc-card",
                            )
                          )
                            void create(d);
                        }}
                        className={`mc-day ${d.slice(0, 7) !== day.slice(0, 7) ? "mc-day--outside" : ""}`}
                        data-today={d === dayKey(new Date().toISOString())}
                        data-drop-day={d}
                        data-drop-active={drag.visual?.target === d}
                      >
                        <header>
                          <span>{Number(d.slice(-2))}</span>
                          {editable && (
                            <button
                              aria-label={`Create post on ${d}`}
                              onClick={() => void create(d)}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </header>
                        {scheduled
                          .filter((p) => dayKey(p.plannedAt!) === d)
                          .map(card)}
                      </section>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
          <section
            className="mc-unscheduled"
            data-drop-day=""
            data-drop-active={drag.visual?.target === "unscheduled"}
          >
            <div className="mc-section-label">
              <div>
                <h2>Unscheduled ideas</h2>
                <p>Ideas without a publishing date.</p>
              </div>
              <span>{unscheduled.length}</span>
              {editable && (
                <button onClick={() => void create(null)}>
                  <Plus size={16} />
                  Add idea
                </button>
              )}
            </div>
            <div className="mc-unscheduled-cards">
              {unscheduled.length ? (
                unscheduled.map(card)
              ) : (
                <p className="mc-muted">
                  {filterCount
                    ? "No ideas match these filters. Clear filters or start a new idea."
                    : "Your undated drafts will live here."}
                </p>
              )}
            </div>
          </section>
          <p className="mc-footnote">
            Planned dates help the team coordinate. Posts are published manually
            in Instagram or Meta Business Suite.
          </p>
          {scope === "ideas" && error && (
            <div className="mc-error" role="alert">
              {error}
              <button onClick={() => void load(true)}>Retry</button>
            </div>
          )}
        </div>
      </div>
      {drag.visual && (
        <div
          className={`mc-drag-overlay ${drag.visual.dropping ? "mc-drag-overlay--dropping" : ""}`}
          style={{
            width: drag.visual.width,
            transform: `translate3d(${drag.visual.x}px,${drag.visual.y}px,0) rotate(${drag.visual.dropping ? 0 : 2}deg)`,
          }}
          aria-hidden="true"
        >
          <CalendarCard
            post={drag.visual.post}
            category={data.categories.find(
              (c) => c.id === drag.visual!.post.category,
            )}
            editable={false}
            preview
            open={() => {}}
          />
          <span className="mc-drag-hint">
            {drag.visual.target
              ? drag.visual.target === "unscheduled"
                ? "Move to unscheduled"
                : `Move to ${drag.visual.target}`
              : "Drag to a date · Esc to cancel"}
          </span>
        </div>
      )}
      <div className="mc-toast-stack" aria-live="polite">
        {notices.map((n) => (
          <div className="mc-toast" key={n.id}>
            <Check size={17} />
            <span>{n.message}</span>
            {n.undo && (
              <button onClick={() => void undo(n)} disabled={n.working}>
                <Undo2 size={14} />
                {n.working ? "Restoring…" : "Undo"}
              </button>
            )}
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setNotices((current) => current.filter((v) => v.id !== n.id))
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {(creating || postId) && (
        <PostPanel
          id={postId}
          user={user}
          members={data.members}
          categories={data.categories}
          onClose={() =>
            router.push("/admin/media-calendar", { scroll: false })
          }
          onChange={() => {
            cache.current.clear();
            void load(true);
          }}
        />
      )}
    </main>
  );
}
