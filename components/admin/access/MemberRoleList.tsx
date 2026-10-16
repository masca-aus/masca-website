"use client";
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { CalendarSelect } from "../mediaCalendar/CalendarSelect";
import {
  memberAreaLabels,
  memberRolePresets,
} from "@/features/access/memberPresentation";
import type {
  CommitteeArea,
  CommitteeRole,
} from "@/features/access/committeePolicy";
import type {
  AccessPerson,
  AccessWorkspace,
  GraphMembership,
} from "@/features/access/workspaces/types";
import type { AccessMutation } from "@/features/access/workspaces/mutations";
import { AccessSaveError } from "./inlineTypes";

export function MemberRoleList({
  person,
  membership,
  workspace,
  disabled,
  onSave,
  onReview,
}: {
  person: AccessPerson;
  membership: GraphMembership;
  workspace: AccessWorkspace;
  disabled: boolean;
  onSave: (input: AccessMutation) => Promise<void>;
  onReview: () => Promise<unknown>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{
    area: CommitteeArea;
    value: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [focusRequest, setFocusRequest] = useState<{
    area?: CommitteeArea;
    version: number;
  } | null>(null);
  const restoreFocus = (area?: CommitteeArea) =>
    setFocusRequest((old) => ({ area, version: (old?.version ?? 0) + 1 }));
  useEffect(() => {
    if (!focusRequest || !root.current) return;
    if (
      document.activeElement !== document.body &&
      !root.current.contains(document.activeElement)
    )
      return;
    const control = focusRequest.area
      ? root.current.querySelector<HTMLButtonElement>(
          `[data-role-area="${focusRequest.area}"] button`,
        )
      : null;
    (control && !control.disabled ? control : root.current).focus({
      preventScroll: true,
    });
  }, [focusRequest]);
  const entries = Object.entries(membership.roles).filter(
    ([, roles]) => roles?.length,
  ) as [CommitteeArea, CommitteeRole[]][];
  const changeRole = async (area: CommitteeArea, value: string) => {
    if (disabled || pending || conflict || reviewing) return;
    const roles = membership.roles[area] ?? [];
    const next = value === "none" ? [] : (value.split("+") as CommitteeRole[]);
    if (roles.length === next.length && roles.every((r) => next.includes(r)))
      return;
    setPending({ area, value });
    setError("");
    setMessage("");
    try {
      const base = {
        workspaceId: workspace.id,
        targetId: person.id,
        area,
        expectedRevision: person.revision,
        expectedWorkspaceRevision: workspace.revision,
      };
      await onSave(
        value === "none"
          ? { type: "removeArea", ...base }
          : { type: "assignArea", ...base, roles: next },
      );
      setMessage(
        value === "none"
          ? `${memberAreaLabels[area]} access removed`
          : `${memberAreaLabels[area]} saved`,
      );
      restoreFocus(value === "none" ? undefined : area);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this role.");
      setConflict(e instanceof AccessSaveError && e.status === 409);
      restoreFocus(
        e instanceof AccessSaveError && e.status === 409 ? undefined : area,
      );
    } finally {
      setPending(null);
    }
  };
  return (
    <div
      ref={root}
      className="ag-list-roles"
      role="group"
      aria-label={`Tool roles for ${person.name}`}
      aria-busy={!!pending || reviewing}
      tabIndex={-1}
    >
      {entries.length ? (
        entries.map(([area, roles]) => (
          <div className="ag-list-role-line" key={area} data-role-area={area}>
            <span>{memberAreaLabels[area]}</span>
            <CalendarSelect
              label={`${memberAreaLabels[area]} role for ${person.name}`}
              value={
                pending?.area === area
                  ? pending.value
                  : roles.includes("editor") && roles.includes("approver")
                    ? "editor+approver"
                    : roles.includes("approver")
                      ? "approver"
                      : roles.includes("editor")
                        ? "editor"
                        : "viewer"
              }
              options={[
                { value: "none", label: "No access" },
                ...memberRolePresets,
              ]}
              disabled={
                disabled ||
                !!pending ||
                conflict ||
                reviewing ||
                !workspace.areas.includes(area)
              }
              onChange={(value) => {
                void changeRole(area, value);
              }}
            />
          </div>
        ))
      ) : (
        <span className="ag-list-no-access">No content access</span>
      )}
      <div className="ag-list-role-feedback" role="status">
        {pending || reviewing ? (
          <>
            <LoaderCircle size={12} className="ag-list-role-spinner" />
            {reviewing ? "Loading latest access…" : "Saving…"}
          </>
        ) : (
          message && (
            <>
              <Check size={12} />
              {message}
            </>
          )
        )}
      </div>
      {error && (
        <p className="ag-list-role-error" role="alert">
          {error}
        </p>
      )}
      {conflict && (
        <button
          type="button"
          className="ag-text ag-list-role-review"
          aria-label={`Review latest access for ${person.name}`}
          disabled={disabled || reviewing}
          onClick={async () => {
            setReviewing(true);
            try {
              await onReview();
              setConflict(false);
              setError("");
              setMessage("Latest access loaded. Choose a role to try again.");
              restoreFocus();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not reload access.",
              );
              restoreFocus();
            } finally {
              setReviewing(false);
            }
          }}
        >
          Review latest access
        </button>
      )}
    </div>
  );
}
