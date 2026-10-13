"use client";
import { X } from "lucide-react";
import {
  memberAreaLabels,
  memberRoleLabel,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import type { CommitteeArea } from "@/features/access/committeePolicy";
export function InlineMemberDetails({
  snapshot,
  personId,
  workspaceId,
  onCancel,
  onEdit,
  children,
}: {
  snapshot: AccessGraphSnapshot;
  personId: string;
  workspaceId?: string;
  onCancel: () => void;
  onEdit: (workspaceId: string) => void;
  children?: React.ReactNode;
}) {
  const p = snapshot.people.find((p) => p.id === personId)!;
  const memberships = snapshot.memberships.filter(
    (m) =>
      m.userId === personId && (!workspaceId || m.committee === workspaceId),
  );
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
            {Date.parse(m.expiresAt) <= Date.now() ? "Expired" : "Access ends"}{" "}
            {memberTermLabel(m.expiresAt)}
          </p>
          {snapshot.mode === "active" && (
            <button
              type="button"
              className="ag-text"
              onClick={() => onEdit(m.committee)}
            >
              Edit area access
            </button>
          )}
        </div>
      ))}
      {!memberships.length && (
        <p>No workspace access. Assign a membership to give content access.</p>
      )}
      {children}
    </section>
  );
}
