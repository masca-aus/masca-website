"use client";
import { useState } from "react";
import { CalendarSelect } from "../mediaCalendar/CalendarSelect";
import { CalendarDatePicker } from "../mediaCalendar/CalendarDatePicker";
import { committeeAreas } from "@/features/access/committeePolicy";
import {
  memberAreaLabels,
  memberTermDay,
  memberTermInstant,
} from "@/features/access/memberPresentation";
import { InlineFrame } from "./InlineFrame";
import type { AccessWorkspace } from "@/features/access/workspaces/types";
import type { EditorProps } from "./inlineTypes";
export function InlineWorkspaceEditor({
  onSave,
  onCancel,
  onReview,
  busy,
  workspaces = [],
}: EditorProps & { workspaces?: AccessWorkspace[] }) {
  const [name, setName] = useState(""),
    [kind, setKind] = useState<"committee" | "project">("project"),
    [areas, setAreas] = useState<(typeof committeeAreas)[number][]>([]),
    [term, setTerm] = useState(""),
    [sponsor, setSponsor] = useState("");
  return (
    <InlineFrame
      title="New workspace"
      label="Create workspace"
      onCancel={onCancel}
      busy={busy}
      onReview={onReview}
      saveLabel="Create workspace"
      onSubmit={async () => {
        if (!name.trim()) throw Error("Enter a workspace name.");
        await onSave({
          type: "createWorkspace",
          name: name.trim(),
          kind,
          areas,
          termEnd: term || null,
          sponsorId: kind === "project" && sponsor ? sponsor : null,
        });
      }}
    >
      <label>
        Workspace name
        <input
          aria-label="Workspace name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. MASA organising team"
        />
      </label>
      <label>
        Type
        <CalendarSelect
          label="Workspace type"
          value={kind}
          options={[
            { value: "project", label: "Project team" },
            { value: "committee", label: "Committee" },
          ]}
          onChange={(v) => setKind(v as typeof kind)}
        />
      </label>
      {kind === "project" && (
        <label>
          Sponsoring committee · optional
          <CalendarSelect
            label="Sponsoring committee"
            value={sponsor}
            options={[
              { value: "", label: "None" },
              ...workspaces
                .filter((w) => w.kind === "committee" && w.status === "active")
                .map((w) => ({ value: w.id, label: w.name })),
            ]}
            onChange={setSponsor}
          />
        </label>
      )}
      <fieldset>
        <legend>Tools</legend>
        {committeeAreas.map((a) => (
          <label key={a}>
            <input
              type="checkbox"
              checked={areas.includes(a)}
              onChange={(e) =>
                setAreas(
                  e.target.checked
                    ? [...areas, a]
                    : areas.filter((v) => v !== a),
                )
              }
            />
            {memberAreaLabels[a]}
          </label>
        ))}
      </fieldset>
      <label>
        Confirmed term end · optional
        <CalendarDatePicker
          label="Workspace term end"
          dateOnly
          value={memberTermDay(term)}
          onChange={(day) => setTerm(memberTermInstant(day, term))}
        />
      </label>
      <div className="ag-summary">
        {name.trim() || "New workspace"} · {areas.length} tools. No members or
        content permissions will be assigned.
      </div>
    </InlineFrame>
  );
}
