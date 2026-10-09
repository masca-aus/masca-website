"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  X,
  Copy,
  Download,
  Check,
  Send,
  Pause,
  ChevronDown,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import type {
  Post,
  Asset,
  CalendarUser,
  Member,
  Category,
} from "@/features/mediaCalendar/types";
import { mayApprove, mayUseCalendar } from "@/features/mediaCalendar/policy";
import { CalendarDatePicker } from "./CalendarDatePicker";
import { api, calendarAPI } from "./api";
import { CalendarSelect } from "./CalendarSelect";
import { statusLabels } from "./CalendarCard";
import { MediaDropzone } from "./MediaDropzone";
import { InstagramPreview } from "./InstagramPreview";
import { useUploads } from "./useUploads";
import type { CaptionHandle } from "./CaptionEditor";
const CaptionEditor = dynamic(
  () => import("./CaptionEditor").then((m) => m.CaptionEditor),
  { ssr: false, loading: () => <p>Opening caption…</p> },
);
type Detail = {
  post: Post;
  assets: Asset[];
  pendingUploads: Asset[];
  history: {
    id: string;
    author: string;
    action: string;
    createdAt: string;
    revision: string;
  }[];
};
export function PostPanel(props: {
  id: string;
  user: CalendarUser;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [closing, setClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(closingTimer.current), []);
  const finish = useCallback(() => {
    if (closingTimer.current) return;
    setClosing(true);
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    closingTimer.current = setTimeout(props.onClose, reduced ? 0 : 150);
  }, [props.onClose]);
  useEffect(() => {
    let alive = true;
    void api<Detail>(`${calendarAPI}?id=${props.id}`)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch((e) => {
        if (alive) setError((e as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [props.id]);
  return (
    <div className={`mc-overlay ${closing ? "mc-overlay--closing" : ""}`}>
      {detail ? (
        <LoadedPanel {...props} onClose={finish} initial={detail} />
      ) : (
        <PostPanelLoading
          message={error || "Opening your post…"}
          error={!!error}
          onClose={finish}
        />
      )}
    </div>
  );
}
export function PostPanelLoading({
  message = "Creating your draft…",
  error = false,
  onClose,
}: {
  message?: string;
  error?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={onClose ? "Opening post" : "Creating post"}
      className="mc-panel mc-panel-loading"
    >
      <header className="mc-panel-header">
        <span className="mc-eyebrow">INSTAGRAM · DRAFT</span>
        {onClose && (
          <button aria-label="Close post" onClick={onClose}>
            <X size={22} />
          </button>
        )}
      </header>
      <div className="mc-composer-skeleton">
        <p role={error ? "alert" : "status"}>{message}</p>
        {!error && (
          <>
            <div className="mc-skeleton mc-skeleton-title" />
            <div className="mc-skeleton mc-skeleton-meta" />
            <div className="mc-skeleton mc-skeleton-media" />
            <div className="mc-skeleton mc-skeleton-caption" />
          </>
        )}
      </div>
    </div>
  );
}
function LoadedPanel({
  initial,
  user,
  members,
  categories,
  onClose,
  onChange,
}: {
  initial: Detail;
  user: CalendarUser;
  members: Member[];
  categories: Category[];
  onClose: () => void;
  onChange: () => void;
}) {
  const router = useRouter();
  const [savedPost, setSavedPost] = useState(initial.post),
    [pendingPatch, setPendingPatch] = useState<Partial<Post>>({}),
    [assets, setAssets] = useState(initial.assets),
    [pendingUploads, setPendingUploads] = useState(
      initial.pendingUploads ?? [],
    ),
    [linksDraft, setLinksDraft] = useState(initial.post.links.join("\n")),
    [history, setHistory] = useState(initial.history),
    [title, setTitle] = useState(initial.post.title),
    [caption, setCaption] = useState(initial.post.caption),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [comment, setComment] = useState(""),
    [mentions, setMentions] = useState<string[]>([]),
    [requested, setRequested] = useState(false),
    [changeMessage, setChangeMessage] = useState(""),
    [posting, setPosting] = useState(false),
    [publishedURL, setPublishedURL] = useState(""),
    [copied, setCopied] = useState(false),
    [localCopyExported, setLocalCopyExported] = useState(false),
    [storageFailed, setStorageFailed] = useState(false),
    [discarding, setDiscarding] = useState(false);
  const exportedCopy = useRef(false);
  const post = { ...savedPost, ...pendingPatch };
  const localCopyKey = `masca-calendar-deleted-copy:${user.id}:${post.id}`;
  const [localCopy, setLocalCopy] = useState(() => {
    try {
      return localStorage.getItem(localCopyKey) ?? "";
    } catch {
      return "";
    }
  });
  const deletionCopy = `${title}\n\n${caption}\n\nReference links:\n${linksDraft}\n\nUnsaved details:\n${JSON.stringify(pendingPatch, null, 2)}`;
  const pendingDetails = useRef<Partial<Post>>({});
  const captionRef = useRef<CaptionHandle>(null),
    postRef = useRef(post),
    panel = useRef<HTMLDivElement>(null),
    close = useRef<() => void>(() => {}),
    queue = useRef(Promise.resolve()),
    titleVersion = useRef(post.version),
    localTitle = useRef(title),
    localLinks = useRef(linksDraft),
    linksVersion = useRef(post.version);
  useEffect(() => {
    postRef.current = savedPost;
    localTitle.current = title;
    localLinks.current = linksDraft;
  });
  const editable = mayUseCalendar(user, "edit"),
    locked =
      !editable ||
      !!post.deletedAt ||
      ["in_review", "posted"].includes(post.status),
    canApprove = mayApprove(user, post);
  const focusTitleOnOpen = useRef(
    initial.post.title === "Untitled post" && !locked,
  );
  const keepDeletedCopy = () => {
    const text = `${localTitle.current}\n\n${captionRef.current?.text() ?? caption}\n\nReference links:\n${localLinks.current}\n\nUnsaved details:\n${JSON.stringify(pendingDetails.current, null, 2)}`;
    try {
      localStorage.setItem(localCopyKey, text);
      return true;
    } catch {
      setStorageFailed(true);
      setError(
        "Copy your changes before closing; this device could not keep a local copy.",
      );
      return false;
    }
  };
  const receive = (p: Post) => {
    if (p.version <= postRef.current.version) return;
    if (p.deletedAt) keepDeletedCopy();
    const previous = postRef.current;
    postRef.current = p;
    setSavedPost(p);
    if (localTitle.current === previous.title) {
      setTitle(p.title);
      localTitle.current = p.title;
      titleVersion.current = p.version;
    }
    if (localLinks.current === previous.links.join("\n")) {
      setLinksDraft(p.links.join("\n"));
      localLinks.current = p.links.join("\n");
      linksVersion.current = p.version;
    }
    onChange();
    if (JSON.stringify(p.assets) !== JSON.stringify(previous.assets))
      void api<Detail>(`${calendarAPI}?id=${p.id}`)
        .then((d) => {
          setAssets(d.assets);
          setPendingUploads(d.pendingUploads ?? []);
        })
        .catch(() => {});
    if (p.checkpointAt !== previous.checkpointAt)
      void api<Detail>(`${calendarAPI}?id=${p.id}`)
        .then((d) => setHistory(d.history))
        .catch(() => {});
  };
  const uploads = useUploads(post, (p) => {
    receive(p);
    void api<Detail>(`${calendarAPI}?id=${p.id}`)
      .then((d) => {
        setAssets(d.assets);
        setPendingUploads(d.pendingUploads ?? []);
      })
      .catch(() => {});
  });
  const act = async (action: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await api<{ post: Post }>(calendarAPI, {
        id: postRef.current.id,
        ...action,
      });
      receive(r.post);
      setError("");
      return r.post;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const patch = (values: Partial<Post>, version?: number) => {
    const pending = { ...pendingDetails.current, ...values };
    pendingDetails.current = pending;
    setPendingPatch(pending);
    const op = queue.current
      .catch(() => {})
      .then(() =>
        act({
          action: "patch",
          patch: values,
          expectedVersion: version ?? postRef.current.version,
        }),
      )
      .then((p) => {
        const next = { ...pendingDetails.current };
        for (const key of Object.keys(values) as (keyof Post)[])
          if (JSON.stringify(next[key]) === JSON.stringify(values[key]))
            delete next[key];
        pendingDetails.current = next;
        setPendingPatch(next);
        return p;
      });
    queue.current = op.then(
      () => {},
      () => {},
    );
    return op;
  };
  const saveTitle = async () => {
    if (localTitle.current.trim() !== postRef.current.title) {
      await patch({ title: localTitle.current.trim() }, titleVersion.current);
      titleVersion.current = postRef.current.version;
    }
  };
  const saveLinks = async () => {
    const links = localLinks.current
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    if (JSON.stringify(links) !== JSON.stringify(postRef.current.links)) {
      await patch({ links }, linksVersion.current);
      linksVersion.current = postRef.current.version;
    }
  };
  const flush = async () => {
    await queue.current;
    await saveTitle();
    await saveLinks();
    if (Object.keys(pendingDetails.current).length)
      throw new Error(
        "Some post details have not saved. Load the latest post and retry your changes.",
      );
    await captionRef.current?.flush();
    if (uploads.pending)
      throw new Error("Finish or cancel media uploads before continuing.");
  };
  useEffect(() => {
    close.current = () => {
      if (postRef.current.deletedAt) {
        if (!keepDeletedCopy() && !exportedCopy.current) return;
        captionRef.current?.retainLocal();
        onClose();
        return;
      }
      void (async () => {
        try {
          await flush();
          onClose();
        } catch (e) {
          if (
            !Object.keys(pendingDetails.current).length &&
            localTitle.current.trim() === postRef.current.title &&
            localLinks.current === postRef.current.links.join("\n") &&
            captionRef.current?.retainLocal()
          )
            onClose();
          else setError((e as Error).message);
        }
      })();
    };
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const titleInput =
      panel.current?.querySelector<HTMLInputElement>("#post-panel-title");
    if (focusTitleOnOpen.current && titleInput) {
      titleInput.focus();
      titleInput.select();
    } else panel.current?.querySelector<HTMLElement>("button")?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const targets = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"],[contenteditable="true"],a[href],summary',
          ) ?? [],
        ).filter((el) => el.offsetParent !== null);
        const first = targets[0],
          last = targets.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  const workflow = async (
    action: string,
    extra: Record<string, unknown> = {},
  ) => {
    try {
      if (!["withdraw", "changes"].includes(action)) await flush();
      await act({
        action,
        expectedRevision: postRef.current.contentRevision,
        ...extra,
      });
      setPosting(false);
      setRequested(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const name = (id: string) =>
    members.find((m) => m.id === id)?.name ?? "Former member";
  const copy = async () => {
    await navigator.clipboard.writeText(captionRef.current?.text() ?? caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const copyLocal = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (post.deletedAt) {
        exportedCopy.current = true;
        setLocalCopyExported(true);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Select the local copy below to copy your changes.");
    }
  };
  if (post.deletedAt)
    return (
      <div
        ref={panel}
        className="mc-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleted-post-title"
      >
        <header className="mc-panel-header">
          <h2 id="deleted-post-title">This post was deleted</h2>
          <button aria-label="Close post" onClick={() => close.current()}>
            <X size={20} />
          </button>
        </header>
        <section className="mc-deleted-notice">
          <p>
            A teammate deleted this post. Your unsaved changes are kept on this
            device so you can reuse them if the post is restored.
          </p>
          {error && <p role="alert">{error}</p>}
          <label>
            Local copy
            <textarea
              aria-label="Local copy of deleted post"
              readOnly
              rows={10}
              value={deletionCopy}
            />
          </label>
          <button
            className="mc-primary"
            onClick={() => void copyLocal(deletionCopy)}
          >
            <Copy size={16} />
            {copied ? "Copied" : "Copy my changes"}
          </button>
          <button onClick={() => close.current()}>Back to calendar</button>
          {storageFailed && !localCopyExported && (
            <button
              onClick={() => {
                if (discarding) onClose();
                else setDiscarding(true);
              }}
            >
              {discarding
                ? "Confirm discard and close"
                : "Discard unsaved changes"}
            </button>
          )}
        </section>
      </div>
    );
  return (
    <div
      ref={panel}
      className="mc-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-panel-title"
    >
      <header className="mc-panel-header">
        <div>
          <span className="mc-eyebrow">
            INSTAGRAM · {post.type.toUpperCase()}
          </span>
          <span className="mc-status" data-status={post.status}>
            {post.onHold ? "On hold · " : ""}
            {statusLabels[post.status]}
          </span>
        </div>
        <button aria-label="Close post" onClick={() => close.current()}>
          <X size={22} />
        </button>
      </header>
      {localCopy && (
        <section className="mc-local-recovery">
          <details>
            <summary>Local changes from before deletion</summary>
            <p>
              This copy is saved on this device. Copy any details you want to
              reuse in this draft.
            </p>
            <textarea
              aria-label="Recovered local copy"
              readOnly
              rows={5}
              value={localCopy}
            />
            <button onClick={() => void copyLocal(localCopy)}>
              {copied ? "Copied" : "Copy local changes"}
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem(localCopyKey);
                } catch {}
                setLocalCopy("");
              }}
            >
              Dismiss copy
            </button>
          </details>
        </section>
      )}
      <div className="mc-panel-title">
        <input
          id="post-panel-title"
          aria-label="Post title"
          value={title}
          disabled={locked}
          maxLength={140}
          onFocus={() => {
            titleVersion.current = postRef.current.version;
          }}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void saveTitle().catch(() => {})}
        />
        <div className="mc-post-meta">
          <label>
            Planned for
            <CalendarDatePicker
              label="Planned publishing date and time"
              disabled={!editable || post.status === "posted"}
              value={post.plannedAt}
              onChange={(value) =>
                void patch({ plannedAt: value }).catch(() => {})
              }
            />
          </label>
          <label>
            Tag
            <CalendarSelect
              label="Post tag"
              disabled={!editable || post.status === "posted"}
              value={post.category ?? ""}
              onChange={(value) =>
                void patch({ category: value || null }).catch(() => {})
              }
              options={[
                { value: "", label: "Add a tag" },
                ...categories
                  .filter((c) => !c.archived || c.id === post.category)
                  .map((c) => ({
                    value: c.id,
                    label: c.name + (c.archived ? " (archived)" : ""),
                    color: c.color,
                  })),
              ]}
            />
          </label>
          <label>
            Format
            <CalendarSelect
              label="Post format"
              disabled={locked}
              value={post.type}
              onChange={(value) =>
                void patch({ type: value as Post["type"] }).catch(() => {})
              }
              options={[
                { value: "feed", label: "Feed post" },
                { value: "carousel", label: "Carousel" },
                { value: "reel", label: "Reel" },
                { value: "story", label: "Story" },
              ]}
            />
          </label>
        </div>
        <small className="mc-muted">
          Australia/Brisbane · AEST · planned date only
        </small>
      </div>
      {error && (
        <div className="mc-error" role="alert">
          {error}
          <button
            onClick={() =>
              void api<Detail>(`${calendarAPI}?id=${post.id}`).then((d) => {
                receive(d.post);
                setAssets(d.assets);
                titleVersion.current = d.post.version;
                linksVersion.current = d.post.version;
                setPendingUploads(d.pendingUploads ?? []);
                setError(
                  "Latest post loaded. Your local title and caption are kept; retry your edit when ready.",
                );
              })
            }
          >
            Load latest
          </button>
          {Object.keys(pendingPatch).length > 0 && (
            <button
              onClick={() =>
                void patch({ ...pendingDetails.current }).catch(() => {})
              }
            >
              Retry details
            </button>
          )}
        </div>
      )}
      <div className="mc-panel-body">
        <div className="mc-compose">
          <MediaDropzone
            post={post}
            assets={assets}
            disabled={locked}
            uploads={uploads.uploads}
            pendingUploads={pendingUploads.filter(
              (a) => !uploads.uploads.some((u) => u.assetId === a.id),
            )}
            cancelPending={(id) =>
              void api(`${calendarAPI}/assets`, { action: "cancel", id })
                .then(() =>
                  setPendingUploads((v) => v.filter((a) => a.id !== id)),
                )
                .catch((e) => setError(e.message))
            }
            add={uploads.add}
            retry={uploads.retry}
            cancel={uploads.cancel}
            reorder={(ids) => void patch({ assets: ids }).catch(() => {})}
            remove={(id) =>
              void patch({ assets: post.assets.filter((a) => a !== id) }).catch(
                () => {},
              )
            }
          />
          <CaptionEditor
            ref={captionRef}
            post={{ ...post, caption }}
            user={user}
            disabled={locked}
            onPost={receive}
            onCaption={setCaption}
          />
          <details className="mc-details">
            <summary>
              Post details <ChevronDown size={16} />
            </summary>
            <div>
              <label>
                Owner
                <CalendarSelect
                  label="Post owner"
                  disabled={!editable || post.status === "posted"}
                  value={post.owner}
                  onChange={(value) =>
                    void patch({ owner: value }).catch(() => {})
                  }
                  options={members.map((m) => ({ value: m.id, label: m.name }))}
                />
              </label>
              <label>
                Preparation deadline
                <CalendarDatePicker
                  label="Preparation deadline"
                  dateOnly
                  disabled={!editable || post.status === "posted"}
                  value={post.preparationDate}
                  onChange={(value) =>
                    void patch({ preparationDate: value }).catch(() => {})
                  }
                />
              </label>
              <fieldset>
                <legend>Collaborators</legend>
                {members
                  .filter((m) => m.id !== post.owner)
                  .map((m) => (
                    <label className="mc-check" key={m.id}>
                      <input
                        type="checkbox"
                        disabled={!editable || post.status === "posted"}
                        checked={post.collaborators.includes(m.id)}
                        onChange={(e) =>
                          void patch({
                            collaborators: e.target.checked
                              ? [...post.collaborators, m.id]
                              : post.collaborators.filter((id) => id !== m.id),
                          }).catch(() => {})
                        }
                      />
                      {m.name}
                    </label>
                  ))}
              </fieldset>
              <label>
                Reference links
                <textarea
                  value={linksDraft}
                  placeholder="Paste a Canva, Drive or Miro link. One per line."
                  disabled={!editable || post.status === "posted"}
                  onFocus={() => {
                    linksVersion.current = postRef.current.version;
                  }}
                  onChange={(e) => {
                    localLinks.current = e.target.value;
                    setLinksDraft(e.target.value);
                  }}
                  onBlur={() => void saveLinks().catch(() => {})}
                />
              </label>
              <fieldset>
                <legend>Preparation checklist</legend>
                {post.checklist.map((item, i) => (
                  <label key={i} className="mc-check">
                    <input
                      type="checkbox"
                      disabled={!editable || post.status === "posted"}
                      checked={item.done}
                      onChange={(e) =>
                        void patch({
                          checklist: post.checklist.map((v, n) =>
                            n === i ? { ...v, done: e.target.checked } : v,
                          ),
                        }).catch(() => {})
                      }
                    />
                    {item.text}
                  </label>
                ))}
                {editable && post.status !== "posted" && (
                  <input
                    aria-label="Add checklist item"
                    placeholder="Add a task, then press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        const text = e.currentTarget.value.trim();
                        e.currentTarget.value = "";
                        void patch({
                          checklist: [...post.checklist, { text, done: false }],
                        }).catch(() => {});
                      }
                    }}
                  />
                )}
              </fieldset>
              <label className="mc-check">
                <input
                  type="checkbox"
                  disabled={!editable || post.status === "posted"}
                  checked={post.onHold}
                  onChange={(e) =>
                    void patch({ onHold: e.target.checked }).catch(() => {})
                  }
                />
                <Pause size={14} />
                Put on hold
              </label>
              {post.onHold && (
                <label>
                  Hold reason
                  <textarea
                    defaultValue={post.holdReason}
                    disabled={!editable}
                    onBlur={(e) =>
                      void patch({ holdReason: e.target.value }).catch(() => {})
                    }
                  />
                </label>
              )}
            </div>
          </details>
          <section className="mc-comments">
            <div className="mc-section-label">
              <h3>
                <MessageSquare size={17} />
                Discussion
              </h3>
              <span>
                {post.comments.filter((c) => !c.resolved).length} open
              </span>
            </div>
            {post.comments.map((c) => (
              <article
                className="mc-comment"
                data-resolved={c.resolved}
                key={c.id}
              >
                <header>
                  <strong>{name(c.author)}</strong>
                  <small>
                    {new Date(c.createdAt).toLocaleDateString("en-AU")}
                  </small>
                </header>
                <p>{c.body}</p>
                {c.mentions.length > 0 && (
                  <small>
                    {c.mentions.map((id) => `@${name(id)}`).join(" ")}
                  </small>
                )}
                {(editable || c.author === String(user.id)) && (
                  <button
                    onClick={() =>
                      void act({
                        action: "resolve",
                        commentId: c.id,
                        resolved: !c.resolved,
                      }).catch(() => {})
                    }
                  >
                    {c.resolved ? "Reopen" : "Resolve"}
                  </button>
                )}
              </article>
            ))}
            <textarea
              aria-label="Add a comment"
              placeholder="Leave feedback or ask a question…"
              value={comment}
              maxLength={4000}
              onChange={(e) => setComment(e.target.value)}
            />
            <details className="mc-mentions">
              <summary>Notify a teammate</summary>
              {members
                .filter((m) => m.id !== String(user.id))
                .map((m) => (
                  <label className="mc-check" key={m.id}>
                    <input
                      type="checkbox"
                      checked={mentions.includes(m.id)}
                      onChange={(e) =>
                        setMentions(
                          e.target.checked
                            ? [...mentions, m.id]
                            : mentions.filter((id) => id !== m.id),
                        )
                      }
                    />
                    @{m.name}
                  </label>
                ))}
            </details>
            <button
              disabled={!comment.trim() || busy}
              onClick={() =>
                void act({ action: "comment", body: comment, mentions })
                  .then(() => {
                    setComment("");
                    setMentions([]);
                  })
                  .catch(() => {})
              }
            >
              <Send size={15} />
              Add comment
            </button>
          </section>
          <details className="mc-history">
            <summary>Activity & review history</summary>
            {history.map((h) => (
              <p key={h.id}>
                <strong>{h.action.replace("_", " ")}</strong> · {name(h.author)}
                <small>{new Date(h.createdAt).toLocaleString("en-AU")}</small>
              </p>
            ))}
          </details>
        </div>
        <aside>
          <InstagramPreview post={{ ...post, caption }} assets={assets} />
          {post.approval && (
            <div className="mc-approval">
              <Check size={18} />
              <div>
                <strong>Approved by {name(post.approval.by)}</strong>
                <span>Content revision {post.approval.revision}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
      <footer className="mc-panel-footer">
        <div>
          <button onClick={() => void copy()}>
            <Copy size={16} />
            {copied ? "Copied" : "Copy caption"}
          </button>
          <details className="mc-downloads">
            <summary>
              <Download size={16} />
              Download media
            </summary>
            {post.assets.map((id, i) => (
              <a
                key={id}
                href={`${calendarAPI}/assets?id=${id}&download=true`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {i + 1}. {assets.find((a) => a.id === id)?.name ?? "Media"}
              </a>
            ))}
          </details>
          {editable && (
            <button
              onClick={() =>
                void act({
                  action: "duplicate",
                  expectedRevision: post.contentRevision,
                })
                  .then((p) => {
                    router.push(`/admin/media-calendar?post=${p.id}`, {
                      scroll: false,
                    });
                  })
                  .catch(() => {})
              }
            >
              <Copy size={15} />
              Duplicate
            </button>
          )}
        </div>
        <div>
          {["draft", "changes_requested"].includes(post.status) && editable && (
            <button
              className="mc-primary"
              disabled={busy || uploads.pending}
              onClick={() => void workflow("review")}
            >
              <Send size={16} />
              Request review
            </button>
          )}
          {post.status === "in_review" && (
            <>
              {editable && (
                <button
                  disabled={busy}
                  onClick={() => void workflow("withdraw")}
                >
                  Withdraw review
                </button>
              )}
              {mayUseCalendar(user, "approve") && (
                <button
                  disabled={busy}
                  onClick={() => setRequested(!requested)}
                >
                  Request changes
                </button>
              )}
              {canApprove && (
                <button
                  className="mc-primary"
                  disabled={busy}
                  onClick={() => void workflow("approve")}
                >
                  <Check size={16} />
                  Approve post
                </button>
              )}
              {!canApprove && (
                <small>Another reviewer must approve this revision.</small>
              )}
            </>
          )}
          {post.status === "approved" && editable && (
            <button
              className="mc-primary"
              disabled={busy}
              onClick={() => setPosting(!posting)}
            >
              <Check size={16} />
              Mark posted
            </button>
          )}
          {post.status === "posted" && post.publishedURL && (
            <a
              href={post.publishedURL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} />
              View published post
            </a>
          )}
        </div>
      </footer>
      {requested && (
        <div className="mc-workflow-prompt">
          <label>
            What needs changing?
            <textarea
              value={changeMessage}
              onChange={(e) => setChangeMessage(e.target.value)}
            />
          </label>
          <button
            className="mc-primary"
            disabled={!changeMessage.trim() || busy}
            onClick={() => void workflow("changes", { message: changeMessage })}
          >
            Send feedback
          </button>
        </div>
      )}
      {posting && (
        <div className="mc-workflow-prompt">
          <strong>Already published it in Instagram?</strong>
          <p>
            This records that the team posted it. The calendar does not publish
            to Instagram.
          </p>
          <label>
            Instagram link (optional)
            <input
              type="url"
              placeholder="https://www.instagram.com/p/…"
              value={publishedURL}
              onChange={(e) => setPublishedURL(e.target.value)}
            />
          </label>
          <button
            className="mc-primary"
            disabled={busy}
            onClick={() => void workflow("posted", { url: publishedURL })}
          >
            Yes, mark as posted
          </button>
        </div>
      )}
    </div>
  );
}
