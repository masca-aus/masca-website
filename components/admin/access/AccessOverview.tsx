"use client";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Layers,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type {
  AccessGraphSnapshot,
  AccessPerson,
  GraphMembership,
} from "@/features/access/workspaces/types";
import type { CommitteeArea } from "@/features/access/committeePolicy";
import {
  memberAreaLabels,
  memberRoleLabel,
  memberTermLabel,
} from "@/features/access/memberPresentation";
import { PersonAvatar } from "./PeopleTray";
import { useInlineMotion } from "./useInlineMotion";
function current(
  m: GraphMembership,
  p: AccessPerson,
  now: number,
  archived: boolean,
) {
  return !archived && p.status === "active" && Date.parse(m.expiresAt) > now;
}
function Status({
  m,
  p,
  now,
  archived,
  staged,
}: {
  m: GraphMembership;
  p: AccessPerson;
  now: number;
  archived: boolean;
  staged: boolean;
}) {
  return (
    <span className="ag-overview-status">
      {p.status === "suspended" && <span>Suspended</span>}
      {p.status === "invited" && <span>Awaiting sign-in</span>}
      {Date.parse(m.expiresAt) <= now && <span>Expired</span>}
      {archived && <span>Archived workspace</span>}
      {current(m, p, now, archived) && (
        <span>{staged ? "Planned access" : "Active"}</span>
      )}
    </span>
  );
}
export function AccessOverview({
  snapshot,
  now,
  workspaceId,
  onWorkspace,
  archived,
  onArchived,
  onManage,
}: {
  snapshot: AccessGraphSnapshot;
  now: number;
  workspaceId: string | null;
  onWorkspace: (id: string | null) => void;
  archived: boolean;
  onArchived: () => void;
  onManage: (id: string) => void;
}) {
  const [area, setArea] = useState<CommitteeArea | null>(null);
  const root = useRef<HTMLElement>(null);
  const workspaces = snapshot.workspaces.filter(
    (w) => archived || w.status === "active",
  );
  const w = workspaces.find((w) => w.id === workspaceId);
  const members = w
    ? snapshot.memberships
        .filter((m) => m.committee === w.id)
        .flatMap((m) => {
          const p = snapshot.people.find((p) => p.id === m.userId);
          return p ? [{ m, p }] : [];
        })
    : [];
  const selectedArea = w && area && w.areas.includes(area) ? area : null;
  const assigned = members.filter(
    ({ m }) => selectedArea && m.roles[selectedArea]?.length,
  );
  const managers = members.filter(({ m }) => m.manager);
  useInlineMotion(root, { workspaceId, selectedArea, archived });
  useEffect(() => {
    if (!w) return;
    const target = root.current?.querySelector<HTMLElement>(
      selectedArea
        ? ".ag-overview-members > h3"
        : ".ag-overview-detail-heading",
    );
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight)
      target.scrollIntoView?.({
        block: "nearest",
        behavior:
          typeof matchMedia === "function" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
      });
  }, [w, selectedArea]);
  return (
    <section className="ag-overview" aria-label="Access overview" ref={root}>
      <header className="ag-overview-heading">
        <div>
          <h2>Workspaces</h2>
          <p>Choose a workspace to see its tools and people.</p>
        </div>
        {snapshot.workspaces.some((w) => w.status === "archived") && (
          <button
            type="button"
            className="ag-text"
            onClick={() => {
              setArea(null);
              onArchived();
            }}
          >
            {archived ? "Hide archived" : "Show archived"}
          </button>
        )}
      </header>
      <div className="ag-overview-workspaces">
        {workspaces.map((item) => {
          const count = snapshot.memberships.filter(
            (m) => m.committee === item.id,
          ).length;
          return (
            <button
              key={item.id}
              data-motion-key={`workspace-${item.id}`}
              type="button"
              className="ag-overview-workspace"
              aria-label={`Open ${item.name}`}
              aria-expanded={item.id === w?.id}
              aria-controls="ag-overview-detail"
              onClick={() => {
                setArea(null);
                onWorkspace(w?.id === item.id ? null : item.id);
              }}
            >
              <span className="ag-overview-symbol">
                {item.kind === "project" ? (
                  <Layers size={21} />
                ) : (
                  <Building2 size={21} />
                )}
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {count} {count === 1 ? "member" : "members"}
                  {item.status === "archived" ? " · Archived" : ""}
                </small>
              </span>
              <ChevronDown size={16} />
            </button>
          );
        })}
      </div>
      {!workspaces.length && (
        <p className="ag-list-empty">
          {archived ? "No workspaces yet." : "No active workspaces."}
        </p>
      )}
      <div id="ag-overview-detail">
        {w && (
          <section
            className="ag-overview-detail"
            aria-label={`${w.name} overview`}
            data-motion-key={`detail-${w.id}`}
          >
            <header className="ag-overview-detail-heading">
              <div>
                <small>
                  {w.kind === "project"
                    ? "Project workspace"
                    : "Committee workspace"}
                </small>
                <h2>{w.name}</h2>
              </div>
              <button
                type="button"
                className="ag-secondary"
                aria-label={`Manage ${w.name} access`}
                onClick={() => onManage(w.id)}
              >
                Manage access
                <ArrowRight size={15} />
              </button>
            </header>
            {w.status === "archived" && (
              <p className="ag-context">
                Archived workspace · membership access is inactive.
              </p>
            )}
            <div className="ag-overview-section-heading">
              <h3>Tools</h3>
              <span>Choose a tool to see assigned roles</span>
            </div>
            <div className="ag-overview-tools">
              {w.areas.map((a) => {
                const people = members.filter(({ m }) => m.roles[a]?.length);
                const active = people.filter(({ m, p }) =>
                  current(m, p, now, w.status === "archived"),
                ).length;
                return (
                  <button
                    type="button"
                    key={a}
                    className="ag-overview-tool"
                    aria-label={`View ${memberAreaLabels[a]} access`}
                    aria-expanded={selectedArea === a}
                    aria-controls="ag-overview-members"
                    onClick={() => setArea(selectedArea === a ? null : a)}
                  >
                    <strong>{memberAreaLabels[a]}</strong>
                    <small>
                      {people.length
                        ? `${active} current${people.length > active ? ` · ${people.length - active} inactive` : ""}`
                        : "No access assigned"}
                    </small>
                    <ChevronDown size={15} />
                  </button>
                );
              })}
            </div>
            {!w.areas.length && <p>No tools enabled yet.</p>}
            <div id="ag-overview-members">
              {selectedArea && (
                <section
                  className="ag-overview-members"
                  aria-label={`${memberAreaLabels[selectedArea]} members`}
                  data-motion-key={`members-${w.id}-${selectedArea}`}
                >
                  <h3>{memberAreaLabels[selectedArea]} · People</h3>
                  <ul>
                    {assigned.map(({ m, p }) => (
                      <li key={p.id}>
                        <PersonAvatar person={p} />
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.email}</small>
                        </div>
                        <div className="ag-overview-role">
                          <span>{memberRoleLabel(m.roles[selectedArea]!)}</span>
                          <Status
                            m={m}
                            p={p}
                            now={now}
                            archived={w.status === "archived"}
                            staged={snapshot.mode === "staged"}
                          />
                          <small>
                            Term ends {memberTermLabel(m.expiresAt)}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!assigned.length && (
                    <p>No people have access to this tool.</p>
                  )}
                </section>
              )}
            </div>
            <section
              className="ag-overview-managers"
              aria-label={`${w.name} access managers`}
            >
              <div>
                <ShieldCheck size={16} />
                <h3>Access managers</h3>
                <span>Manage membership · content roles are separate</span>
              </div>
              {managers.length ? (
                <ul>
                  {managers.map(({ m, p }) => (
                    <li key={p.id}>
                      <PersonAvatar person={p} />
                      <strong>{p.name}</strong>
                      <Status
                        m={m}
                        p={p}
                        now={now}
                        archived={w.status === "archived"}
                        staged={snapshot.mode === "staged"}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>None assigned</p>
              )}
            </section>
          </section>
        )}
      </div>
    </section>
  );
}
