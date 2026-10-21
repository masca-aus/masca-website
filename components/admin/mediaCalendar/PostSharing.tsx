"use client";
import { useEffect, useState } from "react";
import type { Member, Post } from "@/features/mediaCalendar/types";
import type { SharingGrant } from "@/features/access/committeePolicy";
import { CalendarSelect } from "./CalendarSelect";
import { api, calendarAPI } from "./api";
export function PostSharing({
  post,
  onChange,
}: {
  post: Post;
  onChange: (post: Post) => void;
}) {
  const [targets, setTargets] = useState<Member[]>([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void api<{ members: Member[] }>(
      `${calendarAPI}?id=${post.id}&sharing-targets=true`,
    )
      .then((r) => {
        if (alive) setTargets(r.members);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [open, post.id]);
  const setGrant = async (userId: string, role: string) => {
    setBusy(true);
    setError("");
    const sharedWith = (post.sharedWith ?? []).filter(
      (g) => g.userId !== userId,
    );
    if (role !== "none")
      sharedWith.push({ userId, role: role as SharingGrant["role"] });
    try {
      const r = await api<{ post: Post }>(calendarAPI, {
        id: post.id,
        action: "share",
        expectedVersion: post.version,
        sharedWith,
      });
      onChange(r.post);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <details
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="mc-history"
    >
      <summary>Share this post</summary>
      <p>
        Collaborators can view and comment, or edit content. The{" "}
        {post.owningScope ?? "National"} committee manages review and posting.
      </p>
      {error && <p role="alert">{error}</p>}
      {targets.map((m) => (
        <label className="mc-check" key={m.id}>
          {m.name}
          <CalendarSelect
            label={`Access for ${m.name}`}
            disabled={busy}
            value={
              post.sharedWith?.find((g) => g.userId === m.id)?.role ?? "none"
            }
            onChange={(value) => void setGrant(m.id, value)}
            options={[
              { value: "none", label: "No shared access" },
              { value: "viewer", label: "View and comment" },
              { value: "editor", label: "Edit content" },
            ]}
          />
        </label>
      ))}
      {(post.sharedWith ?? [])
        .filter((g) => !targets.some((m) => m.id === g.userId))
        .map((g) => (
          <button
            key={g.userId}
            disabled={busy}
            onClick={() => void setGrant(g.userId, "none")}
          >
            Remove former collaborator
          </button>
        ))}
    </details>
  );
}
