"use client";
import { X } from "lucide-react";
import {
  memberAreaLabels,
  memberRoleLabel,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import type { CommitteeArea } from "@/features/access/committeePolicy";
import { AccessHistory } from "./AccessHistory";
export function InlineMemberDetails({
  now,
  snapshot,
  personId,
  workspaceId,
  area,
  onCancel,
  onEdit,
  onRenew,
  onRemove,
  children,
  editLabel = "Edit area access",
}: {
  now: number;
  snapshot: AccessGraphSnapshot;
  personId: string;
  workspaceId?: string;
  area?: CommitteeArea;
  onCancel: () => void;
  onEdit: (workspaceId: string) => void;
  onRenew: (workspaceId: string) => void;
  onRemove: (workspaceId: string, areaOnly: boolean) => void;
  children?: React.ReactNode;
  editLabel?: string;
}) {
  const p = snapshot.people.find((p) => p.id === personId)!;
  const memberships = snapshot.memberships.filter(
    (m) =>
      m.userId === personId && (!workspaceId || m.committee === workspaceId),
  );
  const editable =
    snapshot.mode === "active" &&
    (snapshot.viewer.appoint || snapshot.viewer.id !== personId);
  return (
    <section
      className="ag-inline"
      aria-label={`${p.name} access details`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <header>
        <h3>{p.name}</h3>
        <button
          type="button"
          className="ag-icon"
          aria-label="Close details"
          onClick={onCancel}
        >
          <X size={17} />
        </button>
      </header>
      <p>
        {p.email} ·{" "}
        {p.status === "active"
          ? "Active account"
          : p.status === "invited"
            ? "Awaiting first Google sign-in"
            : "Suspended account"}
      </p>
      {memberships.map((m) => (
        <div className="ag-summary" key={m.id}>
          <strong>
            {snapshot.workspaces.find((w) => w.id === m.committee)?.name}
          </strong>
          {m.manager && <p>Access manager · content roles remain separate</p>}
          <p>
            {Object.entries(m.roles)
              .filter(([, r]) => r?.length)
              .map(
                ([a, r]) =>
                  `${memberAreaLabels[a as CommitteeArea]}: ${memberRoleLabel(r)}`,
              )
              .join(" · ") || "No content roles"}
          </p>
          <p>
            {Date.parse(m.expiresAt) <= now ? "Expired" : "Access ends"}{" "}
            {memberTermLabel(m.expiresAt)}
          </p>
          {editable &&
            snapshot.workspaces.find((w) => w.id === m.committee)?.status ===
              "active" && (
              <div className="ag-detail-actions">
                <button
                  type="button"
                  className="ag-text"
                  onClick={() => onEdit(m.committee)}
                >
                  {editLabel}
                </button>
                <button
                  type="button"
                  className="ag-text"
                  onClick={() => onRenew(m.committee)}
                >
                  Renew term
                </button>
                {area && (
                  <button
                    type="button"
                    className="ag-text"
                    onClick={() => onRemove(m.committee, true)}
                  >
                    Remove this area
                  </button>
                )}
                <button
                  type="button"
                  className="ag-text"
                  onClick={() => onRemove(m.committee, false)}
                >
                  Remove workspace membership
                </button>
              </div>
            )}
          <AccessHistory workspaceId={m.committee} personId={personId} />
        </div>
      ))}
      {!memberships.length && (
        <p>No workspace access. Assign a membership to give content access.</p>
      )}
      {snapshot.viewer.appoint && (
        <a
          href={`/admin/collections/users/${encodeURIComponent(personId)}`}
          className="ag-text"
        >
          Account settings
        </a>
      )}
      {children}
    </section>
  );
}
