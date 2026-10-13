"use client";
import { useEffect, useState } from "react";
import type { SharedAccessRecord } from "@/features/access/workspaces/sharing";
export function SharedAccessSection({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false),
    [records, setRecords] = useState<SharedAccessRecord[] | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    setError("");
    fetch(
      `/api/workspace-access/sharing?workspace=${encodeURIComponent(workspaceId)}`,
      { cache: "no-store", signal: c.signal },
    )
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error ?? "Could not load shared access.");
        if (!c.signal.aborted) setRecords(body.records);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load sharing.");
      });
    return () => c.abort();
  }, [open, workspaceId, attempt]);
  return (
    <section className="ag-detail-section">
      <button
        type="button"
        className="ag-text"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Shared records
      </button>
      {open && (
        <div>
          <p>
            Record access does not create workspace membership. Viewers and
            editors can access only the shared record; approval stays with its
            owning workspace.
          </p>
          {error ? (
            <p role="alert">
              {error}
              <button
                type="button"
                className="ag-text"
                onClick={() => setAttempt((v) => v + 1)}
              >
                Retry shared records
              </button>
            </p>
          ) : records === null ? (
            <p role="status">Loading shared access…</p>
          ) : records.length ? (
            <ul className="ag-shared-records">
              {records.map((r) => (
                <li key={`${r.area}-${r.recordId}`}>
                  <strong>{r.label}</strong>
                  <p>
                    {r.sharedWith
                      .map((p) => `${p.name}: ${p.role}`)
                      .join(" · ")}
                  </p>
                  {r.href && (
                    <a href={r.href} className="ag-text">
                      {r.canManage ? "Manage record sharing" : "View record"}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No records are explicitly shared.</p>
          )}
        </div>
      )}
    </section>
  );
}
