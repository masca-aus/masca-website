"use client";
import { useRef, useState } from "react";
import { Ellipsis, Palette, Pencil, Trash2, Undo2 } from "lucide-react";
import type { Category } from "@/features/mediaCalendar/types";
import { api, calendarAPI } from "./api";
import { FloatingMenu } from "./FloatingMenu";
import { InlineContentType } from "./InlineContentType";

export function ContentTypeRow({
  category,
  selected,
  editable,
  recent,
  onSelect,
  onSaved,
}: {
  category: Category;
  selected: boolean;
  editable: boolean;
  recent?: boolean;
  onSelect: () => void;
  onSaved: (category: Category) => void;
}) {
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    point?: { x: number; y: number };
  } | null>(null);
  const [editing, setEditing] = useState<"name" | "colour" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const filter = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);
  const closeMenu = (focus = true) => {
    setMenu(null);
    if (focus) trigger.current?.focus({ preventScroll: true });
  };
  const finishEdit = () => {
    setEditing(null);
    queueMicrotask(() => filter.current?.focus({ preventScroll: true }));
  };
  const archive = async (archived: boolean) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ category: Category }>(calendarAPI, {
        action: "category",
        category: { ...category, archived },
      });
      onSaved(result.category);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <div
      className="mc-type-row"
      data-selected={selected}
      onContextMenu={(e) => {
        if (!editable || editing || category.archived || busy) return;
        e.preventDefault();
        e.stopPropagation();
        setMenu({
          anchor: trigger.current!,
          point: { x: e.clientX, y: e.clientY },
        });
      }}
    >
      {editing ? (
        <InlineContentType
          initial={category}
          focusColour={editing === "colour"}
          onCancel={finishEdit}
          onCreated={(saved) => {
            onSaved(saved);
            finishEdit();
          }}
        />
      ) : category.archived ? (
        <div className="mc-type-deleted-row">
          <i className="mc-color-dot" style={{ background: category.color }} />
          <span>{category.name}</span>
          <button
            disabled={busy}
            aria-label={
              recent
                ? `Undo delete ${category.name}`
                : `Restore content type ${category.name}`
            }
            onClick={() => void archive(false)}
          >
            <Undo2 size={12} /> {recent ? "Undo" : "Restore"}
          </button>
        </div>
      ) : (
        <div className="mc-type-filter-row">
          <button
            ref={filter}
            className="mc-type-filter"
            aria-label={`Filter by ${category.name}`}
            aria-pressed={selected}
            onClick={onSelect}
          >
            <i
              className="mc-color-dot"
              style={{ background: category.color }}
            />
            <span>{category.name}</span>
          </button>
          {editable && (
            <button
              ref={trigger}
              className="mc-type-actions"
              aria-label={`Actions for ${category.name}`}
              aria-haspopup="menu"
              aria-expanded={!!menu}
              disabled={busy}
              onClick={(e) =>
                setMenu(menu ? null : { anchor: e.currentTarget })
              }
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMenu({ anchor: e.currentTarget });
                }
              }}
            >
              <Ellipsis size={15} />
            </button>
          )}
        </div>
      )}
      {editable && menu && (
        <FloatingMenu
          label={`Actions for ${category.name}`}
          anchor={menu.anchor}
          point={menu.point}
          onClose={closeMenu}
          items={[
            { value: "name", label: "Rename", icon: <Pencil size={14} /> },
            {
              value: "colour",
              label: "Change colour",
              icon: <Palette size={14} />,
            },
            {
              value: "delete",
              label: "Delete",
              icon: <Trash2 size={14} />,
              danger: true,
            },
          ]}
          onSelect={(action) => {
            closeMenu(false);
            if (action === "delete") void archive(true);
            else {
              setError("");
              setEditing(action as "name" | "colour");
            }
          }}
        />
      )}
      {error && (
        <p className="mc-type-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
