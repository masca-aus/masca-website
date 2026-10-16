"use client";
import { useEffect, useState } from "react";
import {
  memberAreaLabels,
  memberRoleLabel,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import {
  committeeAreas,
  type CommitteeArea,
  type CommitteeRole,
} from "@/features/access/committeePolicy";
type Entry = {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
  before: unknown;
  after: unknown;
};
const actions: Record<string, string> = {
  assignArea: "Area access assigned",
  removeArea: "Area access removed",
  saveMembership: "Membership updated",
  renewMembership: "Term renewed",
  removeMembership: "Membership removed",
  assign: "Membership assigned",
  remove: "Membership removed",
  "assign-or-renew": "Membership assigned or renewed",
  "change-or-renew": "Membership changed or renewed",
  createWorkspace: "Workspace created",
  configureWorkspace: "Workspace configured",
  "create-workspace": "Workspace created",
  archiveWorkspace: "Workspace archived",
  restoreWorkspace: "Workspace restored",
};
function summary(value: unknown) {
  if (!value || typeof value !== "object") return "No membership";
  const v = value as {
    roles?: Partial<Record<CommitteeArea, CommitteeRole[]>>;
    expiresAt?: string;
    manager?: boolean;
    name?: string;
    areas?: string[];
    status?: string;
    termEnd?: string | null;
  };
  if (Array.isArray(v.areas))
    return [
      v.name,
      ...v.areas
        .filter((a) => (committeeAreas as readonly string[]).includes(a))
        .map((a) => memberAreaLabels[a as CommitteeArea]),
      v.status === "archived" ? "Archived" : "Active",
      v.termEnd ? `Default term ${memberTermLabel(v.termEnd)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  return [
    v.manager ? "Access manager" : "",
    ...Object.entries(v.roles ?? {})
      .filter(
        ([a, r]) =>
          (committeeAreas as readonly string[]).includes(a) && r?.length,
      )
      .map(
        ([a, r]) =>
          `${memberAreaLabels[a as CommitteeArea]}: ${memberRoleLabel(r)}`,
      ),
    v.expiresAt ? `Ends ${memberTermLabel(v.expiresAt)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
export function AccessHistory({
  workspaceId,
  personId,
  initialOpen = false,
}: {
  workspaceId: string;
  personId?: string;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen),
    [entries, setEntries] = useState<Entry[] | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    fetch(
      `/api/workspace-access/history?${new URLSearchParams({ workspace: workspaceId, ...(personId ? { person: personId } : {}) })}`,
      { cache: "no-store", signal: c.signal },
    )
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.error ?? "Could not load history.");
        if (!c.signal.aborted) setEntries(body.history);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load history.");
      });
    return () => c.abort();
  }, [open, workspaceId, personId, attempt]);
  return (
    <section className="ag-detail-section">
      <button
        type="button"
        className="ag-text"
        aria-expanded={open}
        onClick={() => {
          setError("");
          setOpen((v) => !v);
        }}
      >
        Access history
      </button>
      {open && (
        <div>
          {error ? (
            <p role="alert">
              {error}{" "}
              <button
                type="button"
                className="ag-text"
                onClick={() => {
                  setError("");
                  setAttempt((v) => v + 1);
                }}
              >
                Retry history
              </button>
            </p>
          ) : entries === null ? (
            <p role="status">Loading history…</p>
          ) : entries.length ? (
            <ol className="ag-history">
              {entries.map((e) => (
                <li key={e.id}>
                  <strong>
                    {actions[e.action] ?? e.action.replace(/-/g, " ")}
                  </strong>
                  <p>
                    {e.actorName} ·{" "}
                    {new Date(e.createdAt).toLocaleDateString("en-AU", {
                      timeZone: "Australia/Brisbane",
                    })}
                  </p>
                  <small>
                    {summary(e.before)} → {summary(e.after)}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>No recorded changes yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
