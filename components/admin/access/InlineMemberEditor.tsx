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
  const selectedToolCount = Object.values(roles).filter(
    (r) => r?.length,
  ).length;
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
        !(manage && m) &&
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
      className={manage ? "ag-member-form" : undefined}
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
              Choose a role for each tool. Leave the rest at No access.
            </p>
          )}
          <div className="ag-tool-roles">
            {w.areas.map((a) =>
              manage ? (
                <div key={a} data-enabled={!!roles[a]?.length}>
                  <span className="ag-tool-name">{memberAreaLabels[a]}</span>
                  <CalendarSelect
                    label={`${memberAreaLabels[a]} role`}
                    value={roles[a]?.length ? roleValue(roles[a]!) : "none"}
                    options={[
                      { value: "none", label: "No access" },
                      ...memberRolePresets,
                    ]}
                    onChange={(value) =>
                      setRoleEdits((edits) => ({
                        ...edits,
                        [a]: value === "none" ? [] : parseRoles(value),
                      }))
                    }
                  />
                </div>
              ) : (
                <div key={a}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!roles[a]?.length}
                      onChange={(e) =>
                        setRoleEdits({
                          ...roleEdits,
                          [a]: e.target.checked ? ["viewer"] : [],
                        })
                      }
                    />
                    {memberAreaLabels[a]}
                  </label>
                  {!!roles[a]?.length && (
                    <CalendarSelect
                      label={`${memberAreaLabels[a]} role`}
                      value={roleValue(roles[a] ?? [])}
                      options={memberRolePresets}
                      onChange={(v) =>
                        setRoleEdits((edits) => ({
                          ...edits,
                          [a]: parseRoles(v),
                        }))
                      }
                    />
                  )}
                </div>
              ),
            )}
          </div>
          {manage && w.areas.length > 0 && (
            <details className="ag-role-guide">
              <summary>What do the roles mean?</summary>
              <p>
                <strong>Viewer</strong> · Read and comment.
                <br />
                <strong>Editor</strong> · Prepare drafts and request review.
                <br />
                <strong>Approver</strong> · Approve another person’s work.
                <br />
                <strong>Editor + Approver</strong> · Both responsibilities;
                self-approval stays blocked.
              </p>
            </details>
          )}
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
      <MemberStep
        enabled={manage}
        number={manager ? 2 : 3}
        title={manage ? "Term ends" : "Term"}
      >
        <div className="ag-term">
          {!manage && <label>Term ends</label>}
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
              ? "Use Renew term to extend this date."
              : "Through the selected day · AEST"}
          </p>
        )}
      </MemberStep>
      {manage ? (
        <div className="ag-member-review" aria-live="polite">
          <span>
            {manager
              ? "Workspace access manager"
              : `${selectedToolCount} ${selectedToolCount === 1 ? "tool" : "tools"} selected`}
          </span>
          <span>Other workspaces stay unchanged.</span>
        </div>
      ) : (
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
            . {`Access ends ${memberTermLabel(effectiveExpiry)}.`}
          </p>
          {m && (
            <small>
              Other area roles and the existing term stay unchanged. Renew the
              term separately.
            </small>
          )}
          {!m && (
            <small>
              Account reuse preserves all other workspace memberships.
            </small>
          )}
        </div>
      )}
    </InlineFrame>
  );
}
