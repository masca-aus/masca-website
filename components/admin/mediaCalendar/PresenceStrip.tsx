"use client";
import Image from "next/image";
import { useState } from "react";

export type CollaborationConnection =
  | "connecting"
  | "live"
  | "reconnecting"
  | "unavailable";

export type PresencePerson = {
  userId: string;
  name: string;
  color: string;
  postId?: string | null;
  photoVersion?: string | null;
};

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
  const present = Array.from(
    new Map(
      people
        .filter((p) => !postId || p.postId === postId)
        .map((p) => [p.userId, p]),
    ).values(),
  );
  return (
    <div
      className={postId ? "mc-presence" : "mc-room-presence"}
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
        <span title={`${present.length - 5} more people`}>
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
    </div>
  );
}
