"use client";
import { InlineFrame } from "./InlineFrame";
import { memberAreaLabels } from "@/features/access/memberPresentation";
import type { InlineContext, EditorProps } from "./inlineTypes";
export function MembershipRemoval({
  context,
  areaOnly = false,
  onSave,
  onCancel,
  onReview,
  busy,
}: { context: InlineContext; areaOnly?: boolean } & EditorProps) {
  const w = context.snapshot.workspaces.find(
      (w) => w.id === context.workspaceId,
    )!,
    p = context.snapshot.people.find((p) => p.id === context.personId)!;
  return (
    <InlineFrame
      title={areaOnly ? "Remove area access" : "Remove workspace membership"}
      label="Remove access"
      onCancel={onCancel}
      onReview={onReview}
      busy={busy}
      saveLabel="Remove access"
      onSubmit={() =>
        onSave(
          areaOnly && context.area
            ? {
                type: "removeArea",
                workspaceId: w.id,
                expectedWorkspaceRevision: w.revision,
                targetId: p.id,
                expectedRevision: p.revision,
                area: context.area,
              }
            : {
                type: "removeMembership",
                workspaceId: w.id,
                expectedWorkspaceRevision: w.revision,
                targetId: p.id,
                expectedRevision: p.revision,
              },
        )
      }
    >
      <div className="ag-summary">
        Remove {p.name} from{" "}
        {areaOnly && context.area
          ? `${memberAreaLabels[context.area]} in `
          : ""}
        {w.name}.{" "}
        {areaOnly
          ? "Their other area roles remain."
          : "All area roles and access management in this workspace end."}{" "}
        Other workspaces and attribution are preserved. Account suspension is a
        separate platform setting.
      </div>
    </InlineFrame>
  );
}
