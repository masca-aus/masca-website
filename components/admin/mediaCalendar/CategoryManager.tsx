"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import type { Category } from "@/features/mediaCalendar/types";
import { api, calendarAPI } from "./api";
export function CategoryManager({
  categories,
  startNew = false,
  onClose,
  onUpdate,
}: {
  categories: Category[];
  startNew?: boolean;
  onClose: () => void;
  onUpdate: (category: Category) => void;
}) {
  const newType = () => ({
    id: crypto.randomUUID(),
    name: "New content type",
    color: "#5959c9",
    archived: false,
  });
  const [items, setItems] = useState(() =>
      startNew ? [newType()] : categories,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const newName = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startNew) {
      newName.current?.focus({ preventScroll: true });
      newName.current?.select();
    }
  }, [startNew]);
  const save = async (c: Category) => {
    setBusy(true);
    try {
      await api(calendarAPI, { action: "category", category: c });
      setError("");
      onUpdate(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mc-category-editor">
      <header>
        <h3>{startNew ? "New content type" : "Content types"}</h3>
        <button aria-label="Close content types" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p>
        Organise posts by content type, such as Events or Recruitment. Everyone
        who prepares posts can customise these.
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
            aria-label="Content type name"
            ref={startNew && i === items.length - 1 ? newName : undefined}
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
            disabled={
              busy || !c.name.trim() || !/^#[0-9a-f]{6}$/i.test(c.color)
            }
            onClick={() => void save(c)}
          >
            {startNew ? "Create content type" : "Save"}
          </button>
          {!startNew && (
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
          )}
          {startNew && (
            <button onClick={onClose} disabled={busy}>
              Cancel
            </button>
          )}
        </div>
      ))}
      {!startNew && (
        <button onClick={() => setItems([...items, newType()])}>
          <Plus size={16} />
          Add content type
        </button>
      )}
      {error && (
        <p role="alert" className="mc-error">
          {error}
        </p>
      )}
    </div>
  );
}
