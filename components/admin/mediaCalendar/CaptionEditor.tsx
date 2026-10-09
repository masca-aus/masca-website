"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import * as Y from "yjs";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, placeholder } from "@codemirror/view";
import { yCollab } from "y-codemirror.next";
import { Awareness, applyAwarenessUpdate } from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import type { Post, CalendarUser } from "@/features/mediaCalendar/types";
import { api, calendarAPI, RequestError } from "./api";
export type CaptionHandle = {
  flush: () => Promise<void>;
  text: () => string;
  retainLocal: () => boolean;
};
type Participant = {
  clientId: string;
  userId: string;
  name: string;
  color: string;
  postId: string | null;
  cursor: { anchor: string; head: string } | null;
};
const encode = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 16000)
    s += String.fromCharCode(...b.subarray(i, i + 16000));
  return btoa(s);
};
const decode = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function numericClient(id: string) {
  let h = 2166136261;
  for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function CaptionEditor({
  post,
  user,
  disabled,
  onPost,
  onCaption,
  ref,
}: {
  post: Post;
  user: CalendarUser;
  disabled: boolean;
  onPost: (p: Post) => void;
  onCaption: (caption: string) => void;
  ref?: Ref<CaptionHandle>;
}) {
  const editableSlot = useRef(new Compartment());
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<EditorView | null>(null),
    doc = useRef<Y.Doc | null>(null),
    awareness = useRef<Awareness | null>(null),
    flush = useRef<() => Promise<void>>(async () => {}),
    retainLocal = useRef<() => boolean>(() => true),
    postRef = useRef(post),
    callbacks = useRef({ onPost, onCaption }),
    disabledRef = useRef(disabled);
  useEffect(() => {
    postRef.current = post;
    callbacks.current = { onPost, onCaption };
    disabledRef.current = disabled;
  });
  const [saving, setSaving] = useState("Saved"),
    [people, setPeople] = useState<Participant[]>([]),
    [recovery, setRecovery] = useState("");
  useImperativeHandle(
    ref,
    () => ({
      flush: () => flush.current(),
      retainLocal: () => retainLocal.current(),
      text: () =>
        doc.current?.getText("caption").toString() ?? postRef.current.caption,
    }),
    [],
  );
  useEffect(() => {
    const d = new Y.Doc();
    doc.current = d;
    Y.applyUpdate(d, decode(postRef.current.captionState), "server");
    const a = new Awareness(d);
    awareness.current = a;
    const clientId = crypto.randomUUID(),
      key = `masca-caption:${user.id}:${post.id}`;
    let alive = true,
      pending = false,
      deferred: Uint8Array | null = null,
      sending: Promise<void> | null = null,
      idle: ReturnType<typeof setTimeout> | undefined,
      max: ReturnType<typeof setTimeout> | undefined,
      remote: ReturnType<typeof setTimeout> | undefined;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (["in_review", "posted"].includes(postRef.current.status)) {
          deferred = decode(data.update);
          queueMicrotask(() => setRecovery(data.text ?? ""));
        } else {
          Y.applyUpdate(d, decode(data.update), "recovery");
          pending = true;
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
    const persistLocal = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            text: d.getText("caption").toString(),
            update: encode(Y.encodeStateAsUpdate(d)),
          }),
        );
        return true;
      } catch {
        setRecovery(d.getText("caption").toString());
        return false;
      }
    };
    retainLocal.current = () =>
      deferred
        ? localStorage.getItem(key) !== null
        : pending
          ? persistLocal()
          : true;
    const save = async () => {
      if (sending) {
        await sending;
        if (pending) return save();
        return;
      }
      if (deferred) {
        if (
          disabledRef.current ||
          ["in_review", "posted"].includes(postRef.current.status)
        )
          throw new Error(
            "Withdraw review before restoring your local caption.",
          );
        Y.applyUpdate(d, deferred, "recovery");
        deferred = null;
        pending = true;
        persistLocal();
      }
      if (!pending) return;
      if (
        disabledRef.current ||
        ["in_review", "posted"].includes(postRef.current.status)
      ) {
        setRecovery(d.getText("caption").toString());
        setSaving("Local copy kept · content locked");
        throw new Error(
          "This content is locked. Your local caption is kept for recovery.",
        );
      }
      const update = encode(Y.encodeStateAsUpdate(d));
      pending = false;
      if (alive) setSaving("Saving…");
      sending = (async () => {
        try {
          const result = await api<{ post: Post }>(calendarAPI, {
            action: "caption",
            id: post.id,
            update,
          });
          Y.applyUpdate(d, decode(result.post.captionState), "server");
          postRef.current = result.post;
          callbacks.current.onPost(result.post);
          if (!pending) {
            localStorage.removeItem(key);
            if (alive) {
              setSaving("Saved");
              setRecovery("");
            }
          } else persistLocal();
        } catch (e) {
          pending = true;
          persistLocal();
          if (alive) {
            setSaving(
              e instanceof RequestError && e.status === 409
                ? "Local copy kept · content locked"
                : "Save failed · local copy kept",
            );
            setRecovery(d.getText("caption").toString());
          }
          throw e;
        } finally {
          sending = null;
        }
      })();
      await sending;
    };
    flush.current = async () => {
      clearTimeout(idle);
      clearTimeout(max);
      max = undefined;
      await save();
      if (pending) await save();
    };
    const changed = (_update: Uint8Array, origin: unknown) => {
      callbacks.current.onCaption(d.getText("caption").toString());
      if (origin === "server") return;
      pending = true;
      persistLocal();
      if (alive) setSaving("Saving…");
      clearTimeout(idle);
      idle = setTimeout(() => {
        void save().catch(() => {});
      }, 500);
      if (!max)
        max = setTimeout(() => {
          max = undefined;
          void save().catch(() => {});
        }, 2000);
    };
    d.on("update", changed);
    a.setLocalStateField("user", {
      name: user.email.split("@")[0],
      color: "#5959c9",
    });
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: d.getText("caption").toString(),
        extensions: [
          yCollab(d.getText("caption"), a),
          EditorView.lineWrapping,
          placeholder("Write your caption…"),
          editableSlot.current.of(EditorView.editable.of(!disabledRef.current)),
          EditorView.contentAttributes.of({
            "aria-label": "Instagram caption",
            role: "textbox",
            "aria-multiline": "true",
          }),
          EditorView.updateListener.of((v) => {
            if (v.selectionSet && !disabledRef.current) {
              const s = v.state.selection.main;
              a.setLocalStateField("cursor", {
                anchor: Y.createRelativePositionFromTypeIndex(
                  d.getText("caption"),
                  s.anchor,
                ),
                head: Y.createRelativePositionFromTypeIndex(
                  d.getText("caption"),
                  s.head,
                ),
              });
            }
          }),
        ],
      }),
    });
    editor.current = view;
    const seen = new Map<number, number>();
    let connected = true;
    const poll = async () => {
      if (!alive) return;
      try {
        const cursor = a.getLocalState()?.cursor;
        const result = await api<{
          post: Partial<Post> | null;
          participants: Participant[];
        }>(`${calendarAPI}/collaboration`, {
          clientId,
          postId: post.id,
          knownRevision: postRef.current.contentRevision,
          cursor: cursor
            ? {
                anchor: encode(Y.encodeRelativePosition(cursor.anchor)),
                head: encode(Y.encodeRelativePosition(cursor.head)),
              }
            : null,
        });
        if (!alive) return;
        setPeople(result.participants);
        if (result.post) {
          if (result.post.captionState)
            Y.applyUpdate(d, decode(result.post.captionState), "server");
          const snapshot = {
            ...postRef.current,
            ...result.post,
            captionState:
              result.post.captionState ?? postRef.current.captionState,
          };
          if (
            snapshot.deletedAt &&
            snapshot.version >= postRef.current.version
          ) {
            disabledRef.current = true;
            if (pending) persistLocal();
            callbacks.current.onCaption(d.getText("caption").toString());
            callbacks.current.onPost(snapshot);
            return;
          }
          if (snapshot.version >= postRef.current.version) {
            postRef.current = snapshot;
            callbacks.current.onPost(snapshot);
          }
          callbacks.current.onCaption(d.getText("caption").toString());
          if (["in_review", "posted"].includes(snapshot.status) && pending) {
            setRecovery(d.getText("caption").toString());
            setSaving("Local copy kept · content locked");
          }
          view.dispatch({
            effects: editableSlot.current.reconfigure(
              EditorView.editable.of(
                !disabledRef.current &&
                  !["in_review", "posted"].includes(snapshot.status),
              ),
            ),
          });
        }
        const states = result.participants.filter(
          (p) => p.clientId !== clientId && p.postId === post.id,
        );
        const live = new Set<number>();
        for (const p of states) {
          const id = numericClient(p.clientId);
          if (id === a.clientID) continue;
          live.add(id);
          const clock = (seen.get(id) ?? 0) + 1;
          seen.set(id, clock);
          const e = encoding.createEncoder();
          encoding.writeVarUint(e, 1);
          encoding.writeVarUint(e, id);
          encoding.writeVarUint(e, clock);
          let cursor = null;
          try {
            if (p.cursor)
              cursor = {
                anchor: Y.decodeRelativePosition(decode(p.cursor.anchor)),
                head: Y.decodeRelativePosition(decode(p.cursor.head)),
              };
          } catch {
            /* Invalid cursor cannot affect document content. */
          }
          encoding.writeVarString(
            e,
            JSON.stringify({
              user: {
                name: p.name,
                color: p.color,
                colorLight: `${p.color}33`,
              },
              cursor,
            }),
          );
          applyAwarenessUpdate(a, encoding.toUint8Array(e), "server");
        }
        for (const [id, clock] of seen) {
          if (!live.has(id)) {
            const e = encoding.createEncoder();
            encoding.writeVarUint(e, 1);
            encoding.writeVarUint(e, id);
            encoding.writeVarUint(e, clock + 1);
            encoding.writeVarString(e, "null");
            applyAwarenessUpdate(a, encoding.toUint8Array(e), "server");
            seen.delete(id);
          }
        }
        if (!connected && pending) void save().catch(() => {});
        connected = true;
      } catch (e) {
        connected = false;
        if (alive)
          setSaving(
            pending ? "Reconnecting · local copy kept" : "Reconnecting…",
          );
        if (e instanceof RequestError && [401, 403].includes(e.status)) {
          disabledRef.current = true;
          setRecovery(d.getText("caption").toString());
          return;
        }
      }
      if (alive)
        remote = setTimeout(() => void poll(), document.hidden ? 5000 : 750);
    };
    void poll();
    if (pending) void save().catch(() => {});
    callbacks.current.onCaption(d.getText("caption").toString());
    return () => {
      alive = false;
      clearTimeout(idle);
      clearTimeout(max);
      clearTimeout(remote);
      if (pending) persistLocal();
      void api(`${calendarAPI}/collaboration`, {
        clientId,
        postId: post.id,
        cursor: null,
        leave: true,
      }).catch(() => {});
      d.off("update", changed);
      view.destroy();
      a.destroy();
      d.destroy();
      editor.current = null;
      doc.current = null;
      flush.current = async () => {};
    };
  }, [post.id, user.id, user.email]);
  useEffect(() => {
    if (doc.current)
      Y.applyUpdate(doc.current, decode(post.captionState), "server");
    if (editor.current)
      editor.current.dispatch({
        effects: editableSlot.current.reconfigure(
          EditorView.editable.of(!disabled),
        ),
      });
  }, [post.captionState, disabled]);
  return (
    <section className="mc-caption">
      <div className="mc-section-label">
        <h3>Caption</h3>
        <span aria-live="polite">{saving}</span>
      </div>
      <div className="mc-presence" aria-label="People in the calendar">
        {Array.from(new Map(people.map((p) => [p.userId, p])).values()).map(
          (p) => (
            <span
              key={p.userId}
              title={`${p.name}${p.postId === post.id ? " · viewing this post" : ""}`}
              style={{ background: p.color }}
            >
              {p.name.slice(0, 2).toUpperCase()}
            </span>
          ),
        )}
        <small>
          {people.filter((p) => p.postId === post.id).length > 1
            ? "Editing together"
            : "Only you here for now"}
        </small>
      </div>
      <div ref={host} className="mc-caption-input" />
      <div className="mc-caption-meta">
        <small>Named text cursors · changes save automatically</small>
        <span data-over={post.caption.length > 2200}>
          {post.caption.length.toLocaleString()}/2,200
        </span>
      </div>
      {recovery && (
        <div className="mc-recovery" role="alert">
          <strong>Your local caption is safe.</strong>
          <p>
            A connection or review lock interrupted saving. Copy it before
            reloading.
          </p>
          <textarea
            aria-label="Recoverable caption"
            readOnly
            value={recovery}
          />
          <button onClick={() => void navigator.clipboard.writeText(recovery)}>
            Copy local caption
          </button>
          <button
            onClick={() =>
              void flush
                .current()
                .then(() => setRecovery(""))
                .catch(() => {})
            }
          >
            Retry saving
          </button>
        </div>
      )}
    </section>
  );
}
