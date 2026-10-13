"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import type { Category } from "@/features/mediaCalendar/types";
import { api, calendarAPI } from "./api";

const colours = [
  { name: "Violet", value: "#5959c9" },
  { name: "Teal", value: "#337f9c" },
  { name: "Rose", value: "#ac587e" },
  { name: "Green", value: "#398168" },
  { name: "Gold", value: "#aa813e" },
  { name: "Coral", value: "#cf5e48" },
];

export function InlineContentType({
  owningScope,
  onCreated,
  onCancel,
  initial,
  focusColour = false,
}: {
  owningScope?: import("@/features/access/committeePolicy").CommitteeScope;
  onCreated: (category: Category) => void;
  onCancel: () => void;
  initial?: Category;
  focusColour?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colour, setColour] = useState(initial?.color ?? colours[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const id = useRef<string | null>(initial?.id ?? null);
  const colourGroup = useRef<HTMLDivElement>(null);
  const selectName = !!initial;
  useEffect(() => {
    if (focusColour) {
      const swatch =
        colourGroup.current?.querySelector<HTMLButtonElement>(
          'button[aria-pressed="true"]',
        ) ?? colourGroup.current?.querySelector<HTMLButtonElement>("button");
      swatch?.focus({ preventScroll: true });
    } else {
      input.current?.focus({ preventScroll: true });
      if (selectName) input.current?.select();
    }
  }, [focusColour, selectName]);
  const save = async () => {
    if (saving.current || !name.trim()) return;
    saving.current = true;
    setBusy(true);
    setError("");
    id.current ??= crypto.randomUUID();
    try {
      const result = await api<{ category: Category }>(calendarAPI, {
        action: "category",
        create: !initial,
        category: {
          id: id.current,
          ...((initial?.owningScope ?? owningScope)
            ? { owningScope: initial?.owningScope ?? owningScope }
            : {}),
          name: name.trim(),
          color: colour,
          archived: false,
        },
      });
      onCreated(result.category);
    } catch (e) {
      setError((e as Error).message);
      input.current?.focus({ preventScroll: true });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <form
      className="mc-inline-type"
      aria-label={initial ? "Edit content type" : "New content type"}
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (!saving.current) onCancel();
        }
      }}
    >
      <div className="mc-inline-type-name">
        <i
          className="mc-color-dot"
          style={{ background: colour }}
          aria-hidden="true"
        />
        <input
          ref={input}
          aria-label="Content type name"
          placeholder="Type a name…"
          maxLength={50}
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          aria-label={initial ? "Save content type" : "Create content type"}
          title={initial ? "Save content type" : "Create content type"}
          disabled={busy || !name.trim()}
        >
          {busy ? (
            <LoaderCircle size={15} className="mc-inline-type-spinner" />
          ) : (
            <Check size={15} />
          )}
        </button>
        <button
          type="button"
          aria-label={
            initial ? "Cancel editing content type" : "Cancel new content type"
          }
          title="Cancel"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={14} />
        </button>
      </div>
      <div
        className="mc-inline-type-colours"
        ref={colourGroup}
        role="group"
        aria-label="Content type colour"
      >
        {colours.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={c.name}
            title={c.name}
            aria-pressed={colour === c.value}
            disabled={busy}
            style={{ "--mc-swatch": c.value } as CSSProperties}
            onClick={() => setColour(c.value)}
          >
            {colour === c.value && <Check size={11} />}
          </button>
        ))}
      </div>
      {error && (
        <p className="mc-inline-type-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
