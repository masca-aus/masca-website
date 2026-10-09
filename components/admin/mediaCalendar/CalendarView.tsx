"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  SlidersHorizontal,
  Bell,
  Search,
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
import { CalendarCard, statusLabels } from "./CalendarCard";
import { RoomPresence } from "./RoomPresence";
import { CategoryManager } from "./CategoryManager";
import "./calendar.css";
const PostPanel = dynamic(
  () => import("./PostPanel").then((m) => m.PostPanel),
  {
    ssr: false,
    loading: () => (
      <div className="mc-panel-loading" role="status">
        Opening post…
      </div>
    ),
  },
);
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
    [error, setError] = useState(""),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [search, setSearch] = useState(""),
    [manage, setManage] = useState(false),
    [notifications, setNotifications] = useState(false);
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
      if (!document.hidden && !dragging.current) void load(true);
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
    try {
      const result = await api<{ post: Post }>(calendarAPI, {
        action: "create",
        patch: { plannedAt: date ? moveToDay(null, date) : null },
      });
      cache.current.clear();
      await load(true);
      open(result.post.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const move = async (id: string, date: string) => {
    const p = data.posts.find((p) => p.id === id);
    if (!p || p.status === "posted") return;
    const old = data;
    setData({
      ...data,
      posts: data.posts.map((v) =>
        v.id === id ? { ...v, plannedAt: moveToDay(v.plannedAt, date) } : v,
      ),
    });
    dragging.current = true;
    try {
      await api(calendarAPI, {
        id,
        action: "patch",
        expectedVersion: p.version,
        patch: { plannedAt: moveToDay(p.plannedAt, date) },
      });
      cache.current.clear();
      await load(true);
    } catch (e) {
      setData(old);
      setError((e as Error).message);
    } finally {
      dragging.current = false;
    }
  };
  const filtered = data.posts.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (status === "all" ||
        (status === "hold" ? p.onHold : p.status === status)) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );
  const scheduled = filtered.filter((p) => p.plannedAt),
    unscheduled = filtered.filter((p) => !p.plannedAt);
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
      open={() => open(p.id)}
    />
  );
  return (
    <main className="mc-workspace">
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
            <button className="mc-primary" onClick={() => void create(null)}>
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
                {v === "list" ? <List size={16} /> : <CalendarDays size={16} />}
                <span>{v[0].toUpperCase() + v.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mc-filters">
          <label>
            <Search size={15} />
            <input
              aria-label="Search posts"
              placeholder="Search posts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {data.categories
              .filter((c) => !c.archived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([s, label]) => (
              <option key={s} value={s}>
                {label}
              </option>
            ))}
            <option value="hold">On hold</option>
          </select>
          {editable && (
            <button
              onClick={() => setManage(!manage)}
              aria-label="Manage categories"
              aria-expanded={manage}
            >
              <SlidersHorizontal size={16} />
              <span>Categories</span>
            </button>
          )}
          <small>{TIMEZONE} · AEST</small>
        </div>
        {manage && (
          <CategoryManager
            categories={data.categories}
            onClose={() => setManage(false)}
            onUpdate={() => {
              cache.current.clear();
              void load(true);
            }}
          />
        )}
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
          <div className="mc-list">
            {scheduled.length ? (
              days
                .filter((d) =>
                  scheduled.some((p) => dayKey(p.plannedAt!) === d),
                )
                .map((d) => (
                  <section key={d}>
                    <h3>
                      {new Intl.DateTimeFormat("en-AU", {
                        weekday: "short",
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
          <div className={`mc-grid mc-grid--${view}`}>
            <div className="mc-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mc-days">
              {days.map((d) => (
                <section
                  key={d}
                  className={`mc-day ${d.slice(0, 7) !== day.slice(0, 7) ? "mc-day--outside" : ""}`}
                  data-today={d === dayKey(new Date().toISOString())}
                  onDragOver={(e) => {
                    if (editable) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("application/masca-post");
                    if (id && editable) void move(id, d);
                  }}
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
      <section className="mc-unscheduled">
        <div className="mc-section-label">
          <div>
            <h2>Unscheduled</h2>
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
            <p className="mc-muted">Your undated drafts will live here.</p>
          )}
        </div>
      </section>
      <p className="mc-footnote">
        Planned dates help the team coordinate. Posts are published manually in
        Instagram or Meta Business Suite.
      </p>
      {postId && (
        <PostPanel
          key={postId}
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
