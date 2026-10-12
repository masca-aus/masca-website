/* eslint-disable @next/next/no-img-element -- Authorised small private thumbnails bypass the public image cache. */
"use client";
import React, { useRef, useState, type PointerEvent } from "react";
import { FloatingMenu } from "./FloatingMenu";
import {
  Film,
  Images,
  ImageIcon,
  Pause,
  Ellipsis,
  GripVertical,
  FilePenLine,
  Trash2,
  ExternalLink,
} from "lucide-react";
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
  onAction,
  onPickUp,
  moving = false,
  preview = false,
  landed = false,
}: {
  post: Card;
  category?: Category;
  open: () => void;
  editable: boolean;
  onAction?: (action: "draft" | "delete") => void;
  onPickUp?: (event: PointerEvent<HTMLElement>, post: Card) => void;
  moving?: boolean;
  preview?: boolean;
  landed?: boolean;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    point?: { x: number; y: number };
  } | null>(null);
  const close = (focus = true) => {
    setMenu(null);
    if (focus) anchor.current?.focus();
  };
  const Icon =
    post.type === "reel" ? Film : post.type === "carousel" ? Images : ImageIcon;
  return (
    <div
      className={`mc-card ${landed ? "mc-card--landed" : ""}`}
      data-moving={moving}
      onContextMenu={(e) => {
        if (editable && onAction && !preview) {
          e.preventDefault();
          setMenu({
            anchor: anchor.current!,
            point: { x: e.clientX, y: e.clientY },
          });
        }
      }}
      onPointerDown={(e) => {
        if (
          !preview &&
          editable &&
          post.status !== "posted" &&
          !moving &&
          !(e.target as HTMLElement).closest(".mc-card-menu")
        )
          onPickUp?.(e, post);
      }}
      data-status={post.status}
      data-post-id={post.id}
      style={{ borderInlineStartColor: category?.color ?? "#8e93a2" }}
      onDragStart={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="mc-card-open"
        onClick={open}
        aria-label={`Open ${post.title}`}
        tabIndex={preview ? -1 : 0}
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
          <span className="mc-card-tag">
            <i
              className="mc-color-dot"
              style={{ background: category?.color ?? "#8e93a2" }}
            />
            {category?.name ?? "No tag"}
          </span>
          <span className="mc-status">
            {post.onHold ? "On hold · " : ""}
            {statusLabels[post.status]}
          </span>
        </span>
      </button>
      {editable && !preview && onAction && (
        <div className="mc-card-tools">
          {post.status !== "posted" && (
            <button
              type="button"
              className="mc-card-grip"
              aria-label={`Drag ${post.title} to another date`}
              title="Drag to another date"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </button>
          )}
          <button
            ref={anchor}
            type="button"
            className="mc-card-menu"
            aria-label={`Actions for ${post.title}`}
            aria-haspopup="menu"
            aria-expanded={!!menu}
            onClick={(e) => setMenu(menu ? null : { anchor: e.currentTarget })}
          >
            <Ellipsis size={16} />
          </button>
        </div>
      )}
      {editable && menu && (
        <FloatingMenu
          label={`Actions for ${post.title}`}
          anchor={menu.anchor}
          point={menu.point}
          onClose={close}
          items={[
            {
              value: "open",
              label: "Open post",
              icon: <ExternalLink size={15} />,
            },
            ...(post.status !== "draft" && post.status !== "posted"
              ? [
                  {
                    value: "draft",
                    label: "Move to draft",
                    icon: <FilePenLine size={15} />,
                    disabled: moving,
                  },
                ]
              : []),
            {
              value: "delete",
              label: "Delete",
              icon: <Trash2 size={15} />,
              danger: true,
              disabled: moving,
            },
          ]}
          onSelect={(action) => {
            close();
            if (action === "open") open();
            else onAction?.(action as "draft" | "delete");
          }}
        />
      )}
    </div>
  );
}
