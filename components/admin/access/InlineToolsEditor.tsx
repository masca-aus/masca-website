"use client";
import { useState } from "react";
import { committeeAreas } from "@/features/access/committeePolicy";
import {
  memberAreaLabels,
  memberTermDay,
  memberTermInstant,
} from "@/features/access/memberPresentation";
import { CalendarDatePicker } from "../mediaCalendar/CalendarDatePicker";
import type { AccessWorkspace } from "@/features/access/workspaces/types";
import { InlineFrame } from "./InlineFrame";
import type { EditorProps } from "./inlineTypes";
export function InlineToolsEditor({
  workspace,
  startArchive = false,
  onSave,
  onCancel,
  onReview,
  busy,
}: { workspace: AccessWorkspace; startArchive?: boolean } & EditorProps) {
  const [areas, setAreas] = useState(workspace.areas),
    [name, setName] = useState(workspace.name),
    [term, setTerm] = useState(workspace.termEnd ?? ""),
    [archive, setArchive] = useState(
      startArchive || workspace.status === "archived",
    );
  const added = areas.filter((a) => !workspace.areas.includes(a)),
    removed = workspace.areas.filter((a) => !areas.includes(a));
  return (
    <InlineFrame
      title={`${startArchive && workspace.status !== "archived" ? "Delete workspace" : "Manage tools"} · ${workspace.name}`}
      label={
        startArchive && workspace.status !== "archived"
          ? "Delete workspace"
          : "Manage workspace tools"
      }
      reveal={startArchive}
      onCancel={onCancel}
      onReview={onReview}
      busy={busy}
      saveLabel={
        archive
          ? workspace.status === "archived"
            ? "Restore workspace"
            : startArchive
              ? "Delete workspace"
              : "Confirm archive"
          : "Save tools"
      }
      onSubmit={() =>
        onSave(
          archive
            ? {
                type:
                  workspace.status === "archived"
                    ? "restoreWorkspace"
                    : "archiveWorkspace",
                workspaceId: workspace.id,
                expectedRevision: workspace.revision,
              }
            : {
                type: "configureWorkspace",
                workspaceId: workspace.id,
                expectedRevision: workspace.revision,
                name,
                kind: workspace.kind,
                areas,
                termEnd: term || null,
                sponsorId: workspace.sponsorId,
              },
        )
      }
    >
      {archive ? (
        <div className="ag-summary">
          {workspace.status === "archived"
            ? `Restore ${workspace.name}. Existing expiry dates stay unchanged; expired memberships are not renewed.`
            : `Remove ${workspace.name} from active workspaces. It will be archived and can be restored. Private work, sharing and collaboration will stop. Published website content keeps its current visibility.`}
        </div>
      ) : (
        <>
          <label>
            Workspace name
            <input
              aria-label="Workspace name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Enabled tools</legend>
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
            Default term for future memberships · optional
            <CalendarDatePicker
              label="Workspace term end"
              dateOnly
              value={memberTermDay(term)}
              onChange={(day) => setTerm(memberTermInstant(day, term))}
            />
          </label>
          <div className="ag-summary">
            {added.length
              ? `Enable ${added.map((a) => memberAreaLabels[a]).join(", ")}. `
              : ""}
            {removed.length
              ? `Disable ${removed.map((a) => memberAreaLabels[a]).join(", ")}. `
              : ""}
            Enabling tools gives nobody access. Assigned roles must be removed
            before disabling a tool. Existing membership dates stay unchanged.
          </div>
          <button
            type="button"
            className="ag-text"
            onClick={() => setArchive(true)}
          >
            Archive workspace
          </button>
        </>
      )}
    </InlineFrame>
  );
}
