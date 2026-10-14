"use client";
import { useRef, useState } from "react";
import {
  Layers,
  Building2,
  ChevronDown,
  Plus,
  Settings2,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { FloatingMenu, type MenuItem } from "../mediaCalendar/FloatingMenu";
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
  const trigger = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    point?: { x: number; y: number };
  } | null>(null);
  const items: MenuItem[] = [
    ...(onAdd
      ? [
          {
            value: "assign",
            label: "Assign access",
            icon: <UserPlus size={16} />,
            disabled: actionsDisabled,
          },
        ]
      : []),
    ...(onTools
      ? [
          {
            value: "tools",
            label: "Manage tools",
            icon: <Settings2 size={16} />,
            disabled: actionsDisabled,
          },
        ]
      : []),
    ...(onArchive
      ? [
          {
            value: "archive",
            label:
              workspace.status === "archived"
                ? "Restore workspace"
                : "Delete workspace",
            icon:
              workspace.status === "archived" ? (
                <RotateCcw size={16} />
              ) : (
                <Trash2 size={16} />
              ),
            danger: workspace.status !== "archived",
            disabled: actionsDisabled,
          },
        ]
      : []),
    ...(actionsDisabled
      ? [
          {
            value: "staged",
            label: "Changes unlock after the access rollout review",
            disabled: true,
          },
        ]
      : []),
  ];
  const closeMenu = (focus = true) => {
    setMenu(null);
    if (focus) trigger.current?.focus({ preventScroll: true });
  };
  return (
    <section
      className={`ag-workspace ${expanded ? "is-expanded" : ""} ${connected ? "is-connected" : ""}`}
      {...dropProps}
      data-motion-key={workspace.id}
      aria-label={`${workspace.name} workspace`}
    >
      <header
        onContextMenu={(e) => {
          if (!items.length) return;
          e.preventDefault();
          e.stopPropagation();
          setMenu({
            anchor: trigger.current!,
            point: { x: e.clientX, y: e.clientY },
          });
        }}
        onKeyDown={(e) => {
          if (
            items.length &&
            (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))
          ) {
            e.preventDefault();
            setMenu({ anchor: trigger.current! });
          }
        }}
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
        {items.length > 0 && (
          <button
            type="button"
            ref={trigger}
            className="ag-icon ag-workspace-menu"
            aria-label={`Workspace actions for ${workspace.name}`}
            aria-haspopup="menu"
            aria-expanded={!!menu}
            onClick={(e) =>
              menu ? closeMenu() : setMenu({ anchor: e.currentTarget })
            }
          >
            <MoreHorizontal size={19} />
          </button>
        )}
        {workspace.status === "archived" && (
          <span className="ag-badge">Archived</span>
        )}
      </header>
      {menu && (
        <FloatingMenu
          label={`Workspace actions for ${workspace.name}`}
          items={items}
          anchor={menu.anchor}
          point={menu.point}
          onClose={closeMenu}
          onSelect={(value) => {
            closeMenu();
            if (value === "assign") onAdd?.();
            else if (value === "tools") onTools?.();
            else if (value === "archive") onArchive?.();
          }}
        />
      )}
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
