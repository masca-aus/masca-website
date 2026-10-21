"use client";
import { useState, type ReactNode } from "react";
import {
  Building2,
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  UserRoundPen,
  RotateCcw,
  UserMinus,
} from "lucide-react";
import type {
  AccessGraphSnapshot,
  AccessPerson,
  GraphMembership,
} from "@/features/access/workspaces/types";
import { memberTermLabel } from "@/features/access/memberPresentation";
import type { InlineEditorState } from "./inlineTypes";
import type { AccessMutation } from "@/features/access/workspaces/mutations";
import { MemberRoleList } from "./MemberRoleList";
import { AreaBubble } from "./AreaBubble";
import { PersonAvatar } from "./PeopleTray";
import { SharedAccessSection } from "./SharedAccessSection";
import { AccessHistory } from "./AccessHistory";
import { WorkspaceActionHeader } from "./WorkspaceActionHeader";
import { FloatingMenu, type MenuItem } from "../mediaCalendar/FloatingMenu";
type WithoutContext<T> = T extends unknown
  ? Omit<T, "snapshot" | "group">
  : never;
type EditorIntent = WithoutContext<InlineEditorState>;
function MemberActions({
  person,
  editable,
  onEdit,
  onRenew,
  onRemove,
}: {
  person: AccessPerson;
  editable: boolean;
  onEdit: () => void;
  onRenew: () => void;
  onRemove: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items: MenuItem[] = [
    {
      value: "edit",
      label: "Edit access",
      icon: <UserRoundPen size={15} />,
      disabled: !editable,
    },
    {
      value: "renew",
      label: "Renew term",
      icon: <RotateCcw size={15} />,
      disabled: !editable,
    },
    {
      value: "remove",
      label: "Remove from workspace",
      icon: <UserMinus size={15} />,
      danger: true,
      disabled: !editable,
    },
  ];
  return (
    <>
      <button
        type="button"
        className="ag-icon"
        aria-label={`Member actions for ${person.name}`}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <MoreHorizontal size={18} />
      </button>
      {anchor && (
        <FloatingMenu
          label={`Member actions for ${person.name}`}
          items={items}
          anchor={anchor}
          onClose={() => {
            anchor.focus({ preventScroll: true });
            setAnchor(null);
          }}
          onSelect={(v) => {
            anchor.focus({ preventScroll: true });
            setAnchor(null);
            if (v === "edit") onEdit();
            else if (v === "renew") onRenew();
            else onRemove();
          }}
        />
      )}
    </>
  );
}
export function AccessManagement({
  snapshot,
  now,
  workspaceId,
  onWorkspace,
  archived,
  onArchived,
  editor,
  onOpen,
  onNavigate,
  renderEditor,
  busy,
  onRoleSave,
  onRoleReview,
}: {
  snapshot: AccessGraphSnapshot;
  now: number;
  workspaceId: string | null;
  onWorkspace: (id: string) => void;
  archived: boolean;
  onArchived: () => void;
  editor: InlineEditorState | null;
  onOpen: (state: InlineEditorState) => void;
  onNavigate: (fn: () => void) => void;
  renderEditor: (state: InlineEditorState) => ReactNode;
  busy: boolean;
  onRoleSave: (input: AccessMutation) => Promise<void>;
  onRoleReview: () => Promise<unknown>;
}) {
  const [tab, setTab] = useState<"members" | "tools" | "activity">("members"),
    [query, setQuery] = useState("");
  const w =
    snapshot.workspaces.find((w) => w.id === workspaceId) ??
    snapshot.workspaces.find((w) => w.status === "active") ??
    snapshot.workspaces[0];
  const active = snapshot.mode === "active";
  const scoped = w
    ? snapshot.memberships.filter((m) => m.committee === w.id)
    : [];
  const people = scoped
    .map((m) => ({ m, p: snapshot.people.find((p) => p.id === m.userId) }))
    .filter((row): row is { m: GraphMembership; p: AccessPerson } => !!row.p);
  const managers = people
    .filter(
      ({ m, p }) =>
        m.manager && Date.parse(m.expiresAt) > now && p.status === "active",
    )
    .map(({ p }) => p.name);
  const open = (state: EditorIntent) =>
    onOpen({ ...state, snapshot, group: "manage" });
  const inside = editor?.group === "manage" ? editor : null;
  const start = (kind: "member" | "tools", startArchive = false) => {
    if (!w) return;
    onNavigate(() => {
      if (kind === "tools")
        open({ kind: "tools", workspaceId: w.id, startArchive });
      else {
        setQuery("");
        open({ kind: "member", workspaceId: w.id });
      }
    });
  };
  const globalEditor =
    inside &&
    (inside.kind === "workspace" ||
      inside.kind === "person" ||
      inside.kind === "tools" ||
      (inside.kind === "member" && !inside.personId && !inside.area));
  return (
    <div className="ag-management">
      <nav className="ag-workspace-nav" aria-label="Workspaces">
        <header>
          <h2>Workspaces</h2>
          {(snapshot.viewer.create || !active) && (
            <button
              type="button"
              className="ag-icon"
              aria-label="Add workspace"
              disabled={!active || !snapshot.viewer.create}
              onClick={() => open({ kind: "workspace" })}
            >
              <Plus size={18} />
            </button>
          )}
        </header>
        {snapshot.workspaces
          .filter(
            (item) => archived || item.status === "active" || item.id === w?.id,
          )
          .map((item) => (
            <button
              type="button"
              key={item.id}
              className={`ag-nav-workspace ${item.id === w?.id ? "is-current" : ""}`}
              aria-label={`Select workspace ${item.name}`}
              aria-current={item.id === w?.id ? "page" : undefined}
              onClick={() =>
                onNavigate(() => {
                  setQuery("");
                  setTab("members");
                  onWorkspace(item.id);
                })
              }
            >
              {item.kind === "project" ? (
                <Layers size={17} />
              ) : (
                <Building2 size={17} />
              )}
              <span>
                {item.name}
                {item.status === "archived" && <small>Archived</small>}
              </span>
              <small>
                {
                  snapshot.memberships.filter((m) => m.committee === item.id)
                    .length
                }
              </small>
            </button>
          ))}
        {snapshot.workspaces.some((w) => w.status === "archived") && (
          <button
            type="button"
            className="ag-text ag-nav-archived"
            onClick={() => onNavigate(onArchived)}
          >
            {archived ? "Hide archived" : "Show archived"}
          </button>
        )}
      </nav>
      <section
        className="ag-management-panel"
        aria-label={
          w ? `${w.name} access management` : "Workspace access management"
        }
      >
        {w ? (
          <>
            <header className="ag-management-heading">
              <WorkspaceActionHeader
                workspace={w}
                actionsDisabled={!active}
                onAdd={
                  w.status === "active"
                    ? () => {
                        onNavigate(() => setTab("members"));
                        start("member");
                      }
                    : undefined
                }
                onTools={
                  snapshot.viewer.configure ? () => start("tools") : undefined
                }
                onArchive={
                  snapshot.viewer.configure
                    ? () => start("tools", true)
                    : undefined
                }
              >
                <div>
                  <span className="ag-workspace-kind">
                    {w.kind === "project"
                      ? "Project workspace"
                      : "Committee workspace"}
                  </span>
                  <h2>{w.name}</h2>
                  <p>Access managers: {managers.join(", ") || "None active"}</p>
                </div>
              </WorkspaceActionHeader>
            </header>
            <div
              className="ag-management-tabs"
              role="tablist"
              aria-label="Workspace management"
              onKeyDown={(e) => {
                const tabs = ["members", "tools", "activity"] as const;
                const index = tabs.indexOf(tab);
                const next =
                  e.key === "ArrowRight"
                    ? tabs[(index + 1) % tabs.length]
                    : e.key === "ArrowLeft"
                      ? tabs[(index + tabs.length - 1) % tabs.length]
                      : e.key === "Home"
                        ? tabs[0]
                        : e.key === "End"
                          ? tabs[2]
                          : null;
                if (!next) return;
                e.preventDefault();
                const node = e.currentTarget.querySelector<HTMLButtonElement>(
                  `#ag-tab-${next}`,
                );
                onNavigate(() => {
                  setTab(next);
                  node?.focus();
                });
              }}
            >
              {(["members", "tools", "activity"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  role="tab"
                  id={`ag-tab-${value}`}
                  aria-controls="ag-management-pane"
                  aria-selected={tab === value}
                  tabIndex={tab === value ? 0 : -1}
                  onClick={() => onNavigate(() => setTab(value))}
                >
                  {value === "members"
                    ? "Members"
                    : value === "tools"
                      ? "Tools"
                      : "Activity"}
                  {value === "members" && <span>{scoped.length}</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="ag-empty-workspaces">
            <h2>No workspaces yet</h2>
            <p>Create a workspace to start assigning tool access.</p>
          </div>
        )}
        <div
          id="ag-management-pane"
          role="tabpanel"
          aria-labelledby={w ? `ag-tab-${tab}` : undefined}
          className="ag-management-pane"
          key={`${w?.id}:${tab}`}
        >
          {globalEditor && inside?.kind !== "member" && renderEditor(inside!)}
          {w && tab === "members" && (
            <section aria-label={`${w.name} members panel`}>
              <div className="ag-member-toolbar">
                <label className="ag-member-search">
                  <Search size={16} />
                  <input
                    type="search"
                    aria-label="Search members"
                    placeholder="Search members"
                    value={query}
                    disabled={!!editor || busy}
                    onChange={(e) => {
                      if (!editor && !busy) setQuery(e.target.value);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="ag-primary"
                  disabled={!active || w.status !== "active"}
                  onClick={() => start("member")}
                >
                  <Plus size={16} />
                  Add member
                </button>
              </div>
              {scoped.length || (globalEditor && inside?.kind === "member") ? (
                <div className="ag-member-table-wrap">
                  <table className="ag-member-table">
                    <caption>{w.name} members</caption>
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Tool access</th>
                        <th>Term ends</th>
                        <th>
                          <span className="ag-sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalEditor && inside?.kind === "member" && (
                        <tr className="ag-member-expanded ag-member-new">
                          <td colSpan={4}>{renderEditor(inside)}</td>
                        </tr>
                      )}
                      {people
                        .filter(
                          ({ p }) =>
                            (inside &&
                              "personId" in inside &&
                              inside.personId === p.id) ||
                            `${p.name} ${p.email}`
                              .toLowerCase()
                              .includes(query.trim().toLowerCase()),
                        )
                        .map(({ m, p }) => {
                          const rowEditor =
                            inside &&
                            "personId" in inside &&
                            inside.personId === p.id &&
                            !inside.area
                              ? inside
                              : null;
                          const status =
                            p.status === "suspended"
                              ? "Suspended account"
                              : w.status === "archived"
                                ? "Archived workspace"
                                : Date.parse(m.expiresAt) <= now
                                  ? "Expired"
                                  : p.status === "invited"
                                    ? "Awaiting sign-in"
                                    : "";
                          const editable =
                            active &&
                            w.status === "active" &&
                            p.status !== "suspended" &&
                            (snapshot.viewer.appoint ||
                              p.id !== snapshot.viewer.id);
                          return (
                            <MemberRow
                              key={`${w.id}:${p.id}`}
                              person={p}
                              membership={m}
                              status={status}
                              access={
                                <MemberRoleList
                                  person={p}
                                  membership={m}
                                  workspace={w}
                                  disabled={
                                    !editable ||
                                    !!editor ||
                                    busy ||
                                    Date.parse(m.expiresAt) <= now
                                  }
                                  onSave={onRoleSave}
                                  onReview={onRoleReview}
                                />
                              }
                              editable={editable}
                              expanded={!!rowEditor}
                              onOpen={(kind) =>
                                kind === "details" &&
                                rowEditor?.kind === "details"
                                  ? onNavigate(() => {})
                                  : open({
                                      kind,
                                      workspaceId: w.id,
                                      personId: p.id,
                                    } as EditorIntent)
                              }
                            >
                              {rowEditor && renderEditor(rowEditor)}
                            </MemberRow>
                          );
                        })}
                    </tbody>
                  </table>
                  {people.length > 0 &&
                    !people.some(
                      ({ p }) =>
                        (inside &&
                          "personId" in inside &&
                          inside.personId === p.id) ||
                        `${p.name} ${p.email}`
                          .toLowerCase()
                          .includes(query.trim().toLowerCase()),
                    ) && <p className="ag-list-empty">No matching members.</p>}
                </div>
              ) : (
                <div className="ag-list-empty">
                  <h3>No members in this workspace yet</h3>
                  <p>
                    Add a person, choose their tools and roles, then confirm
                    their term.
                  </p>
                </div>
              )}
              {snapshot.viewer.appoint && (
                <button
                  type="button"
                  className="ag-text ag-manager-control"
                  disabled={!active || w.status !== "active"}
                  onClick={() =>
                    open({ kind: "member", workspaceId: w.id, manager: true })
                  }
                >
                  Appoint access manager
                </button>
              )}
            </section>
          )}
          {w && tab === "tools" && (
            <section aria-label={`${w.name} tools panel`}>
              <div className="ag-tools-toolbar">
                <p>
                  Enabled tools grant no access until someone is assigned a
                  role.
                </p>
                {snapshot.viewer.configure && (
                  <button
                    type="button"
                    className="ag-secondary"
                    disabled={!active || w.status !== "active"}
                    onClick={() => start("tools")}
                  >
                    <Plus size={16} />
                    Add tool
                  </button>
                )}
              </div>
              <div className="ag-areas">
                {w.areas.map((area) => (
                  <AreaBubble
                    key={area}
                    now={now}
                    area={area}
                    members={scoped}
                    people={snapshot.people}
                    selectedPerson={null}
                    onPerson={(personId) =>
                      open({
                        kind: "details",
                        workspaceId: w.id,
                        personId,
                        area,
                      })
                    }
                    actionsDisabled={!active}
                    onAdd={
                      w.status === "active"
                        ? () =>
                            open({ kind: "member", workspaceId: w.id, area })
                        : undefined
                    }
                  >
                    {inside && "area" in inside && inside.area === area
                      ? renderEditor(inside)
                      : undefined}
                  </AreaBubble>
                ))}
              </div>
              {active && <SharedAccessSection key={w.id} workspaceId={w.id} />}
              {!w.areas.length && (
                <p className="ag-list-empty">No tools enabled yet.</p>
              )}
            </section>
          )}
          {w && tab === "activity" && (
            <section aria-label={`${w.name} activity`}>
              <p>Membership and workspace changes for {w.name}.</p>
              <AccessHistory key={w.id} workspaceId={w.id} initialOpen />
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
function MemberRow({
  person,
  membership,
  status,
  access,
  editable,
  expanded,
  onOpen,
  children,
}: {
  person: AccessPerson;
  membership: GraphMembership;
  status: string;
  access: ReactNode;
  editable: boolean;
  expanded: boolean;
  onOpen: (kind: "details" | "member" | "renew" | "remove") => void;
  children?: ReactNode;
}) {
  return (
    <>
      <tr
        className={expanded ? "is-expanded" : undefined}
        data-motion-key={`member-${membership.id}`}
      >
        <td>
          <button
            type="button"
            className="ag-member-person"
            aria-label={`View access for ${person.name}`}
            aria-expanded={expanded}
            onClick={() => onOpen("details")}
          >
            <PersonAvatar person={person} />
            <span>
              <strong>{person.name}</strong>
              <small>{person.email}</small>
              {membership.manager && (
                <small className="ag-manager-badge">Access manager</small>
              )}
              {status && <small className="ag-member-status">{status}</small>}
            </span>
          </button>
        </td>
        <td>{access}</td>
        <td>{memberTermLabel(membership.expiresAt)}</td>
        <td>
          <MemberActions
            person={person}
            editable={editable}
            onEdit={() => onOpen("member")}
            onRenew={() => onOpen("renew")}
            onRemove={() => onOpen("remove")}
          />
        </td>
      </tr>
      {children && (
        <tr className="ag-member-expanded">
          <td colSpan={4}>{children}</td>
        </tr>
      )}
    </>
  );
}
