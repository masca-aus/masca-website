"use client";
import { useState, type ReactNode } from "react";
import { ManageMemberPerson } from "./ManageMemberPerson";
import { CalendarSelect } from "../mediaCalendar/CalendarSelect";
import { CalendarDatePicker } from "../mediaCalendar/CalendarDatePicker";
import {
  memberAreaLabels,
  memberRolePresets,
  memberRoleLabel,
  memberTermDay,
  memberTermInstant,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import type {
  CommitteeArea,
  CommitteeMembership,
  CommitteeRole,
} from "@/features/access/committeePolicy";
import type { InlineContext, EditorProps } from "./inlineTypes";
import { useAccessClock } from "./useAccessClock";
import { InlineFrame } from "./InlineFrame";
function MemberStep({
  enabled,
  number,
  title,
  children,
}: {
  enabled: boolean;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return enabled ? (
    <fieldset className="ag-member-step">
      <legend>
        <span aria-hidden="true">{number}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  ) : (
    <>{children}</>
  );
}
export function InlineMemberEditor({
  context,
  manager = false,
  manage = false,
  onSave,
  onCancel,
  onReview,
  busy,
}: {
  context: InlineContext;
  manager?: boolean;
  manage?: boolean;
} & EditorProps) {
  const now = useAccessClock();
  const w = context.snapshot.workspaces.find(
    (w) => w.id === context.workspaceId,
  )!;
  const [personId, setPerson] = useState(context.personId ?? ""),
    [email, setEmail] = useState(""),
    [name, setName] = useState("");
  const p = context.snapshot.people.find((p) => p.id === personId),
    m = context.snapshot.memberships.find(
      (m) => m.userId === personId && m.committee === w.id,
    );
  const [roleEdits, setRoleEdits] = useState<CommitteeMembership["roles"]>({});
  const roles = { ...m?.roles, ...roleEdits };
  const [areaRoles, setAreaRoles] = useState<CommitteeRole[]>(
    context.area ? (m?.roles[context.area] ?? ["viewer"]) : ["viewer"],
  );
  const [expiresAt, setExpiry] = useState(m?.expiresAt ?? w.termEnd ?? "");
  const roleValue = (r: CommitteeRole[]) =>
    r.includes("editor") && r.includes("approver")
      ? "editor+approver"
      : (r[0] ?? "viewer");
  const parseRoles = (value: string) => value.split("+") as CommitteeRole[];
  const choosePerson = (id: string) => {
    setPerson(id);
    setRoleEdits({});
    const m = context.snapshot.memberships.find(
      (m) => m.userId === id && m.committee === w.id,
    );

    setAreaRoles(
      context.area ? (m?.roles[context.area] ?? ["viewer"]) : ["viewer"],
    );
    setExpiry(m?.expiresAt ?? w.termEnd ?? "");
  };
  const effectiveExpiry = m?.expiresAt ?? expiresAt;
  const submit = async () => {
    const normal = email.trim().toLowerCase();
    if (!personId && !/^[^\s@]+@masca\.org\.au$/.test(normal))
      throw Error("Use an individual @masca.org.au email.");
    if (!effectiveExpiry || Date.parse(effectiveExpiry) <= now)
      throw Error("Confirm a future term end date.");
    if (!personId && name.length > 80) throw Error("Use a shorter name.");
    const base = {
      workspaceId: w.id,
      expectedWorkspaceRevision: w.revision,
      expectedRevision: p?.revision ?? "new",
      ...(personId
        ? { targetId: personId }
        : { email: normal, ...(name.trim() ? { name: name.trim() } : {}) }),
    };
    if (context.area)
      await onSave({
        type: "assignArea",
        ...base,
        area: context.area,
        roles: areaRoles,
        ...(!m ? { expiresAt: effectiveExpiry } : {}),
      });
    else {
      if (
        !manager &&
        !m?.manager &&
        !Object.values(roles).some((r) => r?.length)
      )
        throw Error("Choose at least one tool.");
      await onSave({
        type: "saveMembership",
        ...base,
        membership: {
          id: m?.id ?? crypto.randomUUID(),
          committee: w.id,
          roles,
          expiresAt: effectiveExpiry,
          manager: manager || m?.manager || false,
        },
      });
    }
  };
  return (
    <InlineFrame
      reveal
      title={
        manager
          ? "Appoint access manager"
          : context.area
            ? `Add access · ${memberAreaLabels[context.area]}`
            : `${m ? "Edit access" : "Add member"} · ${w.name}`
      }
      label={
        context.area
          ? `Add access to ${memberAreaLabels[context.area]}`
          : "Add workspace member"
      }
      onCancel={onCancel}
      busy={busy}
      onSubmit={submit}
      onReview={onReview}
    >
      {!manage && (
        <p className="ag-context">
          {w.name}
          {context.area ? ` / ${memberAreaLabels[context.area]}` : ""}
        </p>
      )}
      <MemberStep enabled={manage} number={1} title="Person">
        {manage ? (
          <ManageMemberPerson
            people={context.snapshot.people}
            personId={personId}
            fixed={!!context.personId}
            name={name}
            email={email}
            onChoose={choosePerson}
            onName={setName}
            onEmail={setEmail}
          />
        ) : (
          <>
            <div className="ag-fields-row">
              <div>
                <label>Person</label>
                <CalendarSelect
                  label="Person"
                  value={personId}
                  options={[
                    { value: "", label: "Enter a MASCA email" },
                    ...context.snapshot.people
                      .filter((p) => p.status !== "suspended")
                      .map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  onChange={choosePerson}
                />
              </div>
              {context.area && (
                <div>
                  <label>Role</label>
                  <CalendarSelect
                    label="Role"
                    value={roleValue(areaRoles)}
                    options={memberRolePresets}
                    onChange={(v) => setAreaRoles(parseRoles(v))}
                  />
                </div>
              )}
            </div>
            {!personId && (
              <div className="ag-fields-row">
                <label>
                  Name
                  <input
                    aria-label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Optional name"
                  />
                </label>
                <label>
                  MASCA email
                  <input
                    aria-label="MASCA email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@masca.org.au"
                    type="email"
                    autoComplete="off"
                  />
                </label>
              </div>
            )}
          </>
        )}
      </MemberStep>
      {!context.area && !manager && (
        <MemberStep enabled={manage} number={2} title="Tool access">
          {manage && (
            <p className="ag-field-hint">
              Choose their tools, then set a role for each one.
            </p>
          )}
          <div className="ag-tool-roles">
            {w.areas.map((a) => (
              <div key={a}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!roles[a]?.length}
                    onChange={(e) => {
                      setRoleEdits({
                        ...roleEdits,
                        [a]: e.target.checked ? ["viewer"] : [],
                      });
                    }}
                  />
                  {memberAreaLabels[a]}
                </label>
                {manage && !roles[a]?.length && (
                  <span className="ag-no-access">No access</span>
                )}
                {!!roles[a]?.length && (
                  <CalendarSelect
                    label={`${memberAreaLabels[a]} role`}
                    value={roleValue(roles[a] ?? [])}
                    options={memberRolePresets}
                    onChange={(v) => {
                      setRoleEdits((edits) => ({
                        ...edits,
                        [a]: parseRoles(v),
                      }));
                    }}
                  />
                )}
                {manage && !!roles[a]?.length && (
                  <small className="ag-role-hint">
                    {roles[a]?.includes("editor") &&
                    roles[a]?.includes("approver")
                      ? "Prepare content and review another person’s work."
                      : roles[a]?.includes("approver")
                        ? "Review and approve another person’s work."
                        : roles[a]?.includes("editor")
                          ? "Create and edit drafts, then request review."
                          : "Read content and join discussions."}
                  </small>
                )}
              </div>
            ))}
          </div>
          {manage && !w.areas.length && (
            <p className="ag-field-hint">
              No tools are enabled. Cancel and add tools in the Tools tab first.
            </p>
          )}
        </MemberStep>
      )}
      {manager && (
        <p>
          Can manage people in this workspace. Content access stays separate;
          only platform administrators appoint managers.
        </p>
      )}
      <MemberStep enabled={manage} number={manager ? 2 : 3} title="Term">
        <div className="ag-term">
          <label>Term ends</label>
          {m ? (
            <strong>{memberTermLabel(m.expiresAt)}</strong>
          ) : (
            <CalendarDatePicker
              label="Term end"
              dateOnly
              dialogLabel="Choose membership term end"
              value={memberTermDay(expiresAt)}
              onChange={(day) => setExpiry(memberTermInstant(day, expiresAt))}
            />
          )}
        </div>
        {manage && (
          <p className="ag-field-hint">
            {m
              ? "The existing end date is preserved. Use Renew term to extend it."
              : "Access ends at the end of this day (AEST). Choose the confirmed committee term."}
          </p>
        )}
      </MemberStep>
      <div className="ag-summary" aria-live="polite">
        <strong>
          {p?.name ?? (name.trim() || "This person")} → {w.name}
        </strong>
        <p>
          {context.area
            ? `${memberRoleLabel(areaRoles)} for ${memberAreaLabels[context.area]}`
            : manager
              ? "Workspace access manager"
              : Object.entries(roles)
                  .filter(([, r]) => r?.length)
                  .map(
                    ([a, r]) =>
                      `${memberAreaLabels[a as CommitteeArea]}: ${memberRoleLabel(r)}`,
                  )
                  .join(" · ") || "Choose tools above"}
          .{" "}
          {manage && !effectiveExpiry
            ? "Set a term end date above."
            : `Access ends ${memberTermLabel(effectiveExpiry)}.`}
        </p>
        {m && (
          <small>
            {manage
              ? "Other workspace memberships stay unchanged. Renew the term separately."
              : "Other area roles and the existing term stay unchanged. Renew the term separately."}
          </small>
        )}
        {!m && (
          <small>
            Account reuse preserves all other workspace memberships.
          </small>
        )}
      </div>
    </InlineFrame>
  );
}
