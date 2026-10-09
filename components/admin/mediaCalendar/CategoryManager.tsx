"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { Category } from "@/features/mediaCalendar/types";
import { api, calendarAPI } from "./api";
export function CategoryManager({
  categories,
  onClose,
  onUpdate,
}: {
  categories: Category[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [items, setItems] = useState(categories),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async (c: Category) => {
    setBusy(true);
    try {
      await api(calendarAPI, { action: "category", category: c });
      setError("");
      onUpdate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mc-category-editor">
      <header>
        <h3>Post tags</h3>
        <button aria-label="Close tags" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p>
        Give each post a colour tag, such as MASA or Careers. Everyone who
        prepares posts can customise these.
      </p>
      {items.map((c, i) => (
        <div className="mc-category-row" key={c.id}>
          <div
            className="mc-tag-colours"
            role="group"
            aria-label={`${c.name} colour`}
          >
            {[
              "#5959c9",
              "#337f9c",
              "#ac587e",
              "#398168",
              "#aa813e",
              "#cf5e48",
            ].map((colour) => (
              <button
                key={colour}
                aria-label={`Use ${colour} for ${c.name}`}
                aria-pressed={c.color === colour}
                style={{ background: colour }}
                onClick={() =>
                  setItems(
                    items.map((v, n) =>
                      n === i ? { ...v, color: colour } : v,
                    ),
                  )
                }
              />
            ))}
            <input
              aria-label={`${c.name} custom colour`}
              value={c.color}
              maxLength={7}
              placeholder="#5959c9"
              onChange={(e) =>
                setItems(
                  items.map((v, n) =>
                    n === i ? { ...v, color: e.target.value } : v,
                  ),
                )
              }
            />
          </div>
          <input
            aria-label="Tag name"
            value={c.name}
            maxLength={50}
            onChange={(e) =>
              setItems(
                items.map((v, n) =>
                  n === i ? { ...v, name: e.target.value } : v,
                ),
              )
            }
          />
          <button
            disabled={busy || !/^#[0-9a-f]{6}$/i.test(c.color)}
            onClick={() => void save(c)}
          >
            Save
          </button>
          <button
            disabled={busy}
            onClick={() => {
              const v = { ...c, archived: !c.archived };
              setItems(items.map((x, n) => (n === i ? v : x)));
              void save(v);
            }}
          >
            {c.archived ? "Restore" : "Archive"}
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          setItems([
            ...items,
            {
              id: crypto.randomUUID(),
              name: "New tag",
              color: "#5959c9",
              archived: false,
            },
          ])
        }
      >
        <Plus size={16} />
        Add tag
      </button>
      {error && (
        <p role="alert" className="mc-error">
          {error}
        </p>
      )}
    </div>
  );
}
