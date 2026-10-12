"use client";
import { useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  Download,
  ExternalLink,
} from "lucide-react";
import { calendarExport } from "@/features/mediaCalendar/calendarExport";
import type { Post } from "@/features/mediaCalendar/types";
import { FloatingMenu } from "./FloatingMenu";

export function AddToCalendar({
  post,
  disabled = false,
}: {
  post: Pick<Post, "id" | "title" | "plannedAt">;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = !!anchor;
  const dated = !!post.plannedAt && Number.isFinite(Date.parse(post.plannedAt));
  const close = (focus = false) => {
    setAnchor(null);
    if (focus) anchor?.focus();
  };
  return (
    <div className="mc-calendar-export">
      <button
        disabled={disabled || !dated}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => setAnchor(open ? null : event.currentTarget)}
      >
        <CalendarPlus size={15} /> Add to calendar <ChevronDown size={13} />
      </button>
      <small className="mc-muted">
        {!dated
          ? "Add a planned date first"
          : "15-minute entry · changes won’t sync"}
      </small>
      {anchor && !disabled && dated && (
        <FloatingMenu
          label="Add post to calendar"
          anchor={anchor}
          items={[
            {
              value: "google",
              label: "Google Calendar",
              icon: <ExternalLink size={15} />,
            },
            {
              value: "file",
              label: "Apple Calendar / Outlook (.ics)",
              icon: <Download size={15} />,
            },
          ]}
          onClose={close}
          onSelect={(value) => {
            const exported = calendarExport(post, window.location.origin);
            close(true);
            if (!exported) return;
            if (value === "google")
              window.open(exported.googleURL, "_blank", "noopener,noreferrer");
            else {
              const url = URL.createObjectURL(
                new Blob([exported.ics], {
                  type: "text/calendar;charset=utf-8",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "masca-post.ics";
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          }}
        />
      )}
    </div>
  );
}
