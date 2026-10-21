"use client";
import { useAuth, useField } from "@payloadcms/ui";
import { CalendarDatePicker } from "./mediaCalendar/CalendarDatePicker";
import { CalendarSelect } from "./mediaCalendar/CalendarSelect";
import { Check, Plus, ShieldCheck, X } from "lucide-react";
import "./committeeAccess.css";
import "./mediaCalendar/calendar.css";
import {
  committeeAreas,
  committeeScopes,
  type CommitteeMembership,
  type CommitteeAccount,
} from "@/features/access/committeePolicy";
import {
  memberAreaLabels,
  memberRoleLabel,
  memberRolePresets,
  memberTermDay,
  memberTermInstant,
  memberTermLabel,
} from "@/features/access/memberPresentation";

export function MembershipSummary({ value }: { value: CommitteeMembership }) {
  const areas = committeeAreas.filter((area) => value.roles[area]?.length);
  return (
    <aside
      className="access-summary"
      aria-label={`${value.committee} access summary`}
    >
      <span className="access-summary__label">
        <Check size={15} aria-hidden="true" />
        Access summary
      </span>
      {areas.length ? (
        <ul>
          {areas.map((area) => (
            <li key={area}>
              <span>{memberAreaLabels[area]}</span>
              <strong>{memberRoleLabel(value.roles[area])}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p>No content areas selected.</p>
      )}
      {value.manager && (
        <p>
          <ShieldCheck size={14} aria-hidden="true" />
          Can manage people in {value.committee}. Content approval is assigned
          separately.
        </p>
      )}
      <p className="access-summary__term">
        {value.expiresAt
          ? `Access ends ${memberTermLabel(value.expiresAt)} · AEST`
          : "Choose the actual committee term end date."}
      </p>
    </aside>
  );
}

export function MembershipEditor({
  value,
  onChange,
  managerEditable = false,
  disabled = false,
  maxExpiresAt,
  onRemove,
}: {
  value: CommitteeMembership;
  onChange: (value: CommitteeMembership) => void;
  managerEditable?: boolean;
  disabled?: boolean;
  maxExpiresAt?: string;
  onRemove?: () => void;
}) {
  const change = (next: CommitteeMembership) => {
    if (!disabled) onChange(next);
  };
  return (
    <fieldset
      className="committee-access access-membership"
      disabled={disabled}
    >
      <legend>{value.committee} committee</legend>
      {onRemove && !disabled && (
        <button
          type="button"
          className="access-membership__remove"
          aria-label={`Remove ${value.committee} membership`}
          onClick={onRemove}
        >
          <X size={16} />
        </button>
      )}
      <div className="access-term">
        <div>
          <strong>Term end date</strong>
          <span className="access-help">Use the confirmed committee term.</span>
        </div>
        <CalendarDatePicker
          label="Committee term end"
          dialogLabel="Choose committee term end"
          dateOnly
          disabled={disabled}
          value={memberTermDay(value.expiresAt)}
          onChange={(day) =>
            change({
              ...value,
              expiresAt: memberTermInstant(day, value.expiresAt, maxExpiresAt),
            })
          }
        />
      </div>
      {maxExpiresAt && (
        <p className="access-help">
          Your manager term ends {memberTermLabel(maxExpiresAt)}. Member access
          must end by then.
        </p>
      )}
      <div className="access-section-heading">
        <strong>Access areas</strong>
        <span>Choose the areas this person needs.</span>
      </div>
      <div className="access-area-list">
        {committeeAreas.map((area) => {
          const roles = value.roles[area] ?? [],
            selected = roles.length > 0;
          const preset =
            roles.includes("editor") && roles.includes("approver")
              ? "editor+approver"
              : roles.includes("approver")
                ? "approver"
                : roles.includes("editor")
                  ? "editor"
                  : "viewer";
          return (
            <div key={area} className="access-area" data-selected={selected}>
              <label className="access-area__label">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected}
                  aria-label={`Give access to ${memberAreaLabels[area]}`}
                  onChange={(event) => {
                    const next = { ...value.roles };
                    if (event.target.checked) next[area] = ["viewer"];
                    else delete next[area];
                    change({ ...value, roles: next });
                  }}
                />
                <span>{memberAreaLabels[area]}</span>
              </label>
              {selected ? (
                <CalendarSelect
                  label={`${memberAreaLabels[area]} access`}
                  disabled={disabled}
                  value={preset}
                  options={memberRolePresets}
                  onChange={(choice) =>
                    change({
                      ...value,
                      roles: {
                        ...value.roles,
                        [area]:
                          choice === "editor+approver"
                            ? ["editor", "approver"]
                            : [choice as "viewer" | "editor" | "approver"],
                      },
                    })
                  }
                />
              ) : (
                <span className="access-area__none">No access</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="access-help access-role-help">
        Viewers can read and comment. Editors prepare drafts. Approvers review
        and publish another person’s work.
      </p>
      {managerEditable && (
        <details className="access-manager-settings">
          <summary>
            <ShieldCheck size={16} />
            Access management
          </summary>
          <label>
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.manager}
              onChange={(event) =>
                change({ ...value, manager: event.target.checked })
              }
            />
            Committee access manager
          </label>
          <p className="access-help">
            Can assign member roles in {value.committee}. This does not grant
            content access or approval powers.
          </p>
        </details>
      )}
      <MembershipSummary value={value} />
    </fieldset>
  );
}

export function CommitteeMemberships({
  path,
  readOnly = false,
}: {
  path: string;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const { value, setValue, disabled } = useField<CommitteeMembership[]>({
    path,
  });
  const memberships = Array.isArray(value) ? value : [];
  const editable = user?.role === "administrator" && !readOnly && !disabled;
  const available = ((user as unknown as CommitteeAccount)?.accessCatalog?.filter(w=>w.status==="active").map(w=>w.id)??committeeScopes).filter(
    (scope) => !memberships.some((member) => member.committee === scope),
  );
  return (
    <div className="committee-access access-memberships">
      <div className="access-section-heading">
        <strong>Committee access</strong>
        <span>Assign areas and roles within each committee.</span>
      </div>
      {!memberships.length && (
        <div className="access-empty-membership">
          <ShieldCheck size={21} />
          <p>No committee access assigned.</p>
          <span>Choose a committee to set up their access.</span>
        </div>
      )}
      {memberships.map((member) => (
        <MembershipEditor
          key={member.id}
          value={member}
          disabled={!editable}
          managerEditable={editable}
          onChange={(next) => {
            if (editable)
              setValue(
                memberships.map((item) =>
                  item.id === member.id ? next : item,
                ),
              );
          }}
          onRemove={
            editable
              ? () =>
                  setValue(memberships.filter((item) => item.id !== member.id))
              : undefined
          }
        />
      ))}
      {editable && available.length > 0 && (
        <div className="access-add-committee">
          <Plus size={16} />
          <CalendarSelect
            label="Add committee"
            placeholder="Add committee"
            value=""
            options={available.map((scope) => ({ value: scope, label: scope }))}
            onChange={(scope) =>
              setValue([
                ...memberships,
                {
                  id: crypto.randomUUID(),
                  committee: scope as CommitteeMembership["committee"],
                  expiresAt: "",
                  manager: false,
                  roles: {},
                },
              ])
            }
          />
        </div>
      )}
      {editable && (
        <p className="access-help">
          Saving records the account’s committee access review. Term dates must
          be confirmed; access ends automatically when the term expires.
        </p>
      )}
    </div>
  );
}
