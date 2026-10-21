"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  MoreHorizontal,
  Archive,
  RotateCcw,
  UserPlus,
  Settings2,
} from "lucide-react";
import { FloatingMenu, type MenuItem } from "../mediaCalendar/FloatingMenu";
import type { AccessWorkspace } from "@/features/access/workspaces/types";
export function WorkspaceActionHeader({
  workspace,
  onAdd,
  onTools,
  onArchive,
  actionsDisabled = false,
  children,
}: {
  workspace: AccessWorkspace;
  onAdd?: () => void;
  onTools?: () => void;
  onArchive?: () => void;
  actionsDisabled?: boolean;
  children: ReactNode;
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
                : "Archive workspace",
            icon:
              workspace.status === "archived" ? (
                <RotateCcw size={16} />
              ) : (
                <Archive size={16} />
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
    <div
      className="ag-workspace-action-header"
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
      {children}
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
    </div>
  );
}
