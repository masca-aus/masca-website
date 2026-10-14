"use client";
import { Layers, Building2, ChevronDown, Plus, Settings2 } from "lucide-react";
import { WorkspaceActionHeader } from "./WorkspaceActionHeader";
import type { AccessWorkspace } from "@/features/access/workspaces/types";
export function WorkspaceBubble({
  workspace,
  expanded,
  connected,
  count,
  onOpen,
  onAdd,
  onTools,
  onArchive,
  actionsDisabled = false,
  dropProps = {},
  children,
}: {
  workspace: AccessWorkspace;
  expanded: boolean;
  connected: boolean;
  count: number;
  onOpen: () => void;
  onAdd?: () => void;
  onTools?: () => void;
  onArchive?: () => void;
  actionsDisabled?: boolean;
  children?: React.ReactNode;
  dropProps?: Record<string, string>;
}) {
  return (
    <section
      className={`ag-workspace ${expanded ? "is-expanded" : ""} ${connected ? "is-connected" : ""}`}
      {...dropProps}
      data-motion-key={workspace.id}
      aria-label={`${workspace.name} workspace`}
    >
      <header>
        <WorkspaceActionHeader
          workspace={workspace}
          onAdd={onAdd}
          onTools={onTools}
          onArchive={onArchive}
          actionsDisabled={actionsDisabled}
        >
          <button
            type="button"
            className="ag-workspace-heading"
            aria-label={`Open ${workspace.name}`}
            aria-expanded={expanded}
            onClick={onOpen}
          >
            {workspace.kind === "project" ? (
              <Layers size={21} />
            ) : (
              <Building2 size={21} />
            )}
            <span>
              <strong>{workspace.name}</strong>
              <small>
                {workspace.kind === "project"
                  ? "Project workspace"
                  : "Committee workspace"}{" "}
                · {count} {count === 1 ? "member" : "members"}
              </small>
            </span>
            <ChevronDown size={18} />
          </button>
        </WorkspaceActionHeader>
      </header>
      {expanded && (
        <div className="ag-workspace-content">
          <div className="ag-workspace-actions">
            {onAdd && (
              <button
                type="button"
                className="ag-text"
                disabled={actionsDisabled}
                onClick={onAdd}
              >
                <Plus size={16} />
                Add member
              </button>
            )}
            {onTools && (
              <button
                type="button"
                className="ag-text"
                disabled={actionsDisabled}
                onClick={onTools}
              >
                <Settings2 size={16} />
                Manage tools
              </button>
            )}
          </div>
          {children}
        </div>
      )}
    </section>
  );
}
