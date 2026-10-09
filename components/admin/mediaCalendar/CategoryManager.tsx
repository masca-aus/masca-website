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
        <h3>Categories</h3>
        <button aria-label="Close categories" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p>
        Use one category colour for each post. Everyone who prepares posts can
        customise these.
      </p>
      {items.map((c, i) => (
        <div className="mc-category-row" key={c.id}>
          <input
            type="color"
            aria-label={`${c.name} colour`}
            value={c.color}
            onChange={(e) =>
              setItems(
                items.map((v, n) =>
                  n === i ? { ...v, color: e.target.value } : v,
                ),
              )
            }
          />
          <input
            aria-label="Category name"
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
          <button disabled={busy} onClick={() => void save(c)}>
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
              name: "New category",
              color: "#5959c9",
              archived: false,
            },
          ])
        }
      >
        <Plus size={16} />
        Add category
      </button>
      {error && (
        <p role="alert" className="mc-error">
          {error}
        </p>
      )}
    </div>
  );
}
