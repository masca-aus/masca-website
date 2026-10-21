"use client";
import { useState } from "react";
import { CalendarDatePicker } from "../mediaCalendar/CalendarDatePicker";
import {
  memberTermDay,
  memberTermInstant,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import { useAccessClock } from "./useAccessClock";
import { InlineFrame } from "./InlineFrame";
import type { InlineContext, EditorProps } from "./inlineTypes";
export function MembershipRenewal({
  context,
  onSave,
  onCancel,
  onReview,
  busy,
}: { context: InlineContext } & EditorProps) {
  const now = useAccessClock();
  const w = context.snapshot.workspaces.find(
      (w) => w.id === context.workspaceId,
    )!,
    p = context.snapshot.people.find((p) => p.id === context.personId)!,
    m = context.snapshot.memberships.find(
      (m) => m.userId === p.id && m.committee === w.id,
    )!;
  const [term, setTerm] = useState(m.expiresAt);
  const manager = context.snapshot.viewer.appoint
    ? null
    : context.snapshot.memberships.find(
        (m) =>
          m.userId === context.snapshot.viewer.id &&
          m.committee === w.id &&
          m.manager,
      );
  const limit = manager?.expiresAt;
  return (
    <InlineFrame
      title={`Renew term · ${p.name}`}
      label="Renew workspace term"
      onCancel={onCancel}
      onReview={onReview}
      busy={busy}
      saveLabel="Renew term"
      onSubmit={async () => {
        if (Date.parse(term) <= now) throw Error("Choose a future term end.");
        if (limit && Date.parse(term) > Date.parse(limit))
          throw Error("The membership cannot outlast your manager term.");
        await onSave({
          type: "renewMembership",
          workspaceId: w.id,
          expectedWorkspaceRevision: w.revision,
          targetId: p.id,
          expectedRevision: p.revision,
          expiresAt: term,
        });
      }}
    >
      <CalendarDatePicker
        label="New term end"
        dateOnly
        dialogLabel="Choose renewed term end"
        value={memberTermDay(term)}
        onChange={(day) => setTerm(memberTermInstant(day, term, limit))}
      />
      <div className="ag-summary">
        {p.name} will retain all roles in {w.name} until {memberTermLabel(term)}
        . This renews every assigned area in this workspace.
        {limit && <p>Your manager term ends {memberTermLabel(limit)}.</p>}
      </div>
    </InlineFrame>
  );
}
