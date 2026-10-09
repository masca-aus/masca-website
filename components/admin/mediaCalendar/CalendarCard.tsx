/* eslint-disable @next/next/no-img-element -- Authorised small private thumbnails bypass the public image cache. */
"use client";
import { Film, Images, ImageIcon, Pause } from "lucide-react";
import type { Card, Category } from "@/features/mediaCalendar/types";
import { timeLabel } from "@/features/mediaCalendar/dates";
export const statusLabels = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  posted: "Posted",
};
export function CalendarCard({
  post,
  category,
  open,
  editable,
}: {
  post: Card;
  category?: Category;
  open: () => void;
  editable: boolean;
}) {
  const Icon =
    post.type === "reel" ? Film : post.type === "carousel" ? Images : ImageIcon;
  return (
    <button
      type="button"
      className="mc-card"
      data-status={post.status}
      data-post-id={post.id}
      style={{ borderInlineStartColor: category?.color ?? "#8e93a2" }}
      onClick={open}
      draggable={editable && post.status !== "posted"}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/masca-post", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <span className="mc-card-meta">
        <Icon size={13} />
        {post.plannedAt ? timeLabel(post.plannedAt) : "Unscheduled"}
        {post.onHold && <Pause size={12} />}
      </span>
      <span className="mc-card-content">
        {post.thumbnail && (
          <img
            loading="lazy"
            src={`/api/media-calendar/assets?id=${post.thumbnail}&thumbnail=true`}
            alt=""
          />
        )}
        <strong>{post.title}</strong>
      </span>
      <span className="mc-card-footer">
        <span>{category?.name ?? "No category"}</span>
        <span className="mc-status">
          {post.onHold ? "On hold · " : ""}
          {statusLabels[post.status]}
        </span>
      </span>
    </button>
  );
}
