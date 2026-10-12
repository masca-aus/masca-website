"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type CollaborationConnection =
  "connecting" | "live" | "reconnecting" | "unavailable";

export type PresencePerson = {
  userId: string;
  name: string;
  color: string;
  postId?: string | null;
  photoVersion?: string | null;
  postTitle?: string | null;
  activity?: "calendar" | "viewing" | "editing";
};

const activityRank = (p: PresencePerson) =>
  p.activity === "editing"
    ? 2
    : p.activity === "viewing" || (p.activity === undefined && p.postId)
      ? 1
      : 0;
const activityLabel = (p: PresencePerson) =>
  activityRank(p) === 0
    ? "Viewing calendar"
    : `${p.activity === "editing" ? "Editing caption" : "Viewing"} · ${p.postTitle || "Untitled post"}`;

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (
    words.length > 1 ? words[0][0] + words.at(-1)![0] : name.slice(0, 2)
  ).toUpperCase();
}

function AvatarContent({ person }: { person: PresencePerson }) {
  const [failed, setFailed] = useState(false);
  if (!person.photoVersion || failed) return initials(person.name);
  return (
    <Image
      className="mc-presence-photo"
      src={`/api/account/photo?id=${encodeURIComponent(person.userId)}&v=${encodeURIComponent(person.photoVersion)}`}
      alt=""
      width={28}
      height={28}
      // Account photos require the browser's authenticated request.
      unoptimized
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

export function PresenceStrip({
  people,
  postId,
  connection,
}: {
  people: PresencePerson[];
  postId?: string;
  connection?: CollaborationConnection;
}) {
  const members = new Map<string, PresencePerson>();
  for (const p of people.filter((p) => !postId || p.postId === postId)) {
    const existing = members.get(p.userId);
    if (!existing || activityRank(p) >= activityRank(existing))
      members.set(p.userId, p);
  }
  const present = Array.from(members.values());
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const rosterOpen = open && connection === "live" && present.length > 0;
  const available = connection === "live" && present.length > 0;
  const [wasAvailable, setWasAvailable] = useState(available);
  if (wasAvailable !== available) {
    setWasAvailable(available);
    if (!available) setOpen(false);
  }
  useEffect(() => {
    if (!rosterOpen) return;
    const dismiss = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && root.current?.contains(e.target as Node)) {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const focusOutside = (e: FocusEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape, true);
    document.addEventListener("focusin", focusOutside);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("focusin", focusOutside);
    };
  }, [rosterOpen]);
  const attendance = (
    <>
      {present.slice(0, 5).map((p) => (
        <span
          key={p.userId}
          className="mc-presence-avatar"
          title={p.name}
          role="img"
          aria-label={p.name}
          style={{ background: p.color }}
        >
          <AvatarContent key={p.photoVersion ?? "initials"} person={p} />
        </span>
      ))}
      {present.length > 5 && (
        <span
          className="mc-presence-avatar"
          title={`${present.length - 5} more people`}
        >
          +{present.length - 5}
        </span>
      )}
      {(postId || present.length > 0) && (
        <small key={`count-${present.length}`} className="mc-presence-count">
          {postId
            ? present.length > 1
              ? `${present.length} people in this post`
              : present.length === 1
                ? "Only you here for now"
                : "Connecting…"
            : `${present.length} online`}
        </small>
      )}
    </>
  );
  return (
    <div
      className={postId ? "mc-presence" : "mc-room-presence"}
      ref={root}
      aria-label={
        postId
          ? "People viewing this post"
          : "People online in the media calendar"
      }
    >
      {connection && (
        <span
          className="mc-connection"
          data-state={connection}
          aria-label="Collaboration connection"
          role="status"
        >
          <i aria-hidden="true" />
          {connection === "live"
            ? "Live"
            : connection === "connecting"
              ? "Connecting"
              : connection === "reconnecting"
                ? "Reconnecting"
                : "Unavailable"}
        </span>
      )}
      {connection && present.length > 0 ? (
        <button
          type="button"
          className="mc-people-trigger"
          ref={trigger}
          aria-label="People online and their activity"
          aria-expanded={rosterOpen}
          onClick={() => setOpen(!open)}
        >
          {attendance}
          <ChevronDown size={12} />
        </button>
      ) : (
        attendance
      )}
      {rosterOpen && (
        <div
          className="mc-activity-roster"
          role="region"
          aria-label="Live collaboration activity"
        >
          <strong>Here now</strong>
          <ul>
            {present.map((p) => (
              <li key={p.userId}>
                <i style={{ background: p.color }} aria-hidden="true" />
                <div>
                  <b>{p.name}</b>
                  <p>{activityLabel(p)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
