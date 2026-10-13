"use client";
import { useField } from "@payloadcms/ui";
import { CalendarDatePicker } from "./mediaCalendar/CalendarDatePicker";
import "./committeeAccess.css";
import { CalendarSelect } from "./mediaCalendar/CalendarSelect";
import "./mediaCalendar/calendar.css";
import {
  committeeAreas,
  committeeScopes,
  type CommitteeMembership,
} from "@/features/access/committeePolicy";

export function MembershipEditor({
  value,
  onChange,
  managerEditable = false,
}: {
  value: CommitteeMembership;
  onChange: (value: CommitteeMembership) => void;
  managerEditable?: boolean;
}) {
  return (
    <fieldset
      className="committee-access"
      style={{
        padding: "1rem",
        margin: "1rem 0",
        border: "1px solid var(--theme-elevation-200)",
      }}
    >
      <legend>{value.committee} membership</legend>
      <div className="access-term">
        <span>
          Term ends <small>(AEST)</small>
        </span>
        <CalendarDatePicker
          label="Committee term end"
          dialogLabel="Choose committee term end"
          value={value.expiresAt || null}
          onChange={(expiresAt) =>
            onChange({ ...value, expiresAt: expiresAt ?? "" })
          }
        />
      </div>
      <p>
        Choose access for each area. Authors and contributors require another
        approver to publish.
      </p>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {committeeAreas.map((area) => {
          const roles = value.roles[area] ?? [];
          const preset =
            roles.includes("editor") && roles.includes("approver")
              ? "editor+approver"
              : roles.includes("approver")
                ? "approver"
                : roles.includes("editor")
                  ? "editor"
                  : roles.includes("viewer")
                    ? "viewer"
                    : "none";
          return (
            <div key={area} className="access-role-row">
              <span>
                {area === "mediaCalendar"
                  ? "Media calendar"
                  : area.charAt(0).toUpperCase() + area.slice(1)}
              </span>
              <CalendarSelect
                label={`${area} access`}
                value={preset}
                options={rolePresets}
                onChange={(selected) =>
                  onChange({
                    ...value,
                    roles: {
                      ...value.roles,
                      [area]:
                        selected === "none"
                          ? []
                          : selected === "editor+approver"
                            ? ["editor", "approver"]
                            : [selected as "viewer" | "editor" | "approver"],
                    },
                  })
                }
              />
            </div>
          );
        })}
      </div>
      <p className="access-help">
        Viewer: read and comment. Editor: prepare drafts. Approver:
        independently approve and publish. Editor + Approver still requires
        another person to approve your own work.
      </p>
      {managerEditable && (
        <label>
          <input
            type="checkbox"
            checked={value.manager}
            onChange={(e) => onChange({ ...value, manager: e.target.checked })}
          />{" "}
          Committee access manager
        </label>
      )}
    </fieldset>
  );
}
const rolePresets = [
  { value: "none", label: "No access" },
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "approver", label: "Approver" },
  { value: "editor+approver", label: "Editor + Approver" },
];
export function CommitteeMemberships({ path }: { path: string }) {
  const { value, setValue } = useField<CommitteeMembership[]>({ path });
  const memberships = Array.isArray(value) ? value : [];
  return (
    <div className="committee-access">
      <p>
        Set explicit committee terms. Only platform administrators can appoint
        access managers. Saving records this account as reviewed for committee
        access.
      </p>
      {memberships.map((m) => (
        <div key={m.id}>
          <MembershipEditor
            value={m}
            managerEditable
            onChange={(next) =>
              setValue(memberships.map((v) => (v.id === m.id ? next : v)))
            }
          />
          <button
            type="button"
            onClick={() => setValue(memberships.filter((v) => v.id !== m.id))}
          >
            Remove {m.committee} membership
          </button>
        </div>
      ))}
      <CalendarSelect
        label="Add committee"
        value=""
        options={committeeScopes
          .filter((s) => !memberships.some((m) => m.committee === s))
          .map((s) => ({ value: s, label: s }))}
        onChange={(selected) =>
          setValue([
            ...memberships,
            {
              id: crypto.randomUUID(),
              committee: selected as CommitteeMembership["committee"],
              expiresAt: "",
              manager: false,
              roles: {},
            },
          ])
        }
      />
    </div>
  );
}
