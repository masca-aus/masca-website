"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AccessSaveError } from "./inlineTypes";
export function InlineFrame({
  title,
  label,
  onCancel,
  busy,
  onSubmit,
  onReview,
  children,
  saveLabel = "Save access",
  reveal = false,
  className,
}: {
  title: string;
  label: string;
  onCancel: () => void;
  busy: boolean;
  onSubmit: () => Promise<void>;
  onReview?: () => Promise<unknown>;
  children: React.ReactNode;
  saveLabel?: string;
  reveal?: boolean;
  className?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const heading = form.current?.querySelector<HTMLElement>("header button");
    heading?.focus({ preventScroll: true });
    if (reveal && heading) {
      const rect = form.current!.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        const reduced =
          typeof matchMedia === "function" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches;
        form.current?.scrollIntoView?.({
          block: "nearest",
          behavior: reduced ? "auto" : "smooth",
        });
      }
    }
  }, [reveal]);
  const [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [reviewing, setReviewing] = useState(false);
  return (
    <form
      ref={form}
      className={className ? `ag-inline ${className}` : "ag-inline"}
      aria-label={label}
      noValidate
      onKeyDown={(e) => {
        if (
          e.key === "Escape" &&
          !document.querySelector('[role="listbox"],[data-date-popover]')
        ) {
          e.stopPropagation();
          e.preventDefault();
          onCancel();
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || conflict || reviewing) return;
        setError("");
        try {
          await onSubmit();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save.");
          setConflict(e instanceof AccessSaveError && e.status === 409);
        }
      }}
    >
      <header>
        <h3>{title}</h3>
        <button
          type="button"
          className="ag-icon"
          aria-label="Close editor"
          onClick={onCancel}
        >
          <X size={17} />
        </button>
      </header>
      <fieldset className="ag-form-fields" disabled={busy}>
        {children}
      </fieldset>
      {error && (
        <p className="ag-inline-error" role="alert">
          {error}
        </p>
      )}
      {conflict && onReview && (
        <button
          type="button"
          className="ag-secondary"
          disabled={reviewing}
          onClick={async () => {
            setReviewing(true);
            try {
              await onReview();
              setConflict(false);
              setError(
                "Latest access loaded. Review the summary before saving again.",
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not refresh.");
            } finally {
              setReviewing(false);
            }
          }}
        >
          {reviewing ? "Loading latest access…" : "Review latest access"}
        </button>
      )}
      <footer>
        <button type="button" className="ag-text" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="ag-primary"
          disabled={busy || conflict || reviewing}
        >
          {busy ? "Saving…" : saveLabel}
        </button>
      </footer>
    </form>
  );
}
