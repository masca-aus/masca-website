"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, LayoutGrid, Table2, Plus, ShieldCheck } from "lucide-react";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import type { AccessMutation } from "@/features/access/workspaces/mutations";
import { useAccessGraph } from "./useAccessGraph";
import { WorkspaceBubble } from "./WorkspaceBubble";
import { AreaBubble } from "./AreaBubble";
import { PeopleTray, PersonAvatar } from "./PeopleTray";
import { AccessTable } from "./AccessTable";
import { InlineMemberEditor } from "./InlineMemberEditor";
import { InlineWorkspaceEditor } from "./InlineWorkspaceEditor";
import { InlinePersonEditor } from "./InlinePersonEditor";
import { InlineToolsEditor } from "./InlineToolsEditor";
import { InlineMemberDetails } from "./InlineMemberDetails";
import { AccessSaveError, type InlineEditorState } from "./inlineTypes";
import { useInlineMotion } from "./useInlineMotion";
import { useMemberDrag } from "./useMemberDrag";
import "./accessGraph.css";
import "../mediaCalendar/calendar.css";
async function writeMutation(input: AccessMutation) {
  const r = await fetch("/api/workspace-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await r.json();
  if (!r.ok)
    throw new AccessSaveError(body.error ?? "Could not save access.", r.status);
  return body as { snapshot: AccessGraphSnapshot };
}
export function AccessGraph({
  initialSnapshot,
  onMutation = writeMutation,
}: {
  initialSnapshot?: AccessGraphSnapshot;
  onMutation?: (
    input: AccessMutation,
  ) => Promise<{ snapshot: AccessGraphSnapshot }>;
}) {
  const { snapshot, loading, error, retry, applySnapshot } =
      useAccessGraph(initialSnapshot),
    [workspaceId, setWorkspaceId] = useState<string | null>(null),
    [selectedPerson, setPerson] = useState<string | null>(null),
    [view, setView] = useState<"bubbles" | "table">("bubbles"),
    [archived, setArchived] = useState(false),
    [editor, setEditor] = useState<InlineEditorState | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const root = useRef<HTMLElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    candidate = useRef<HTMLElement | null>(null),
    generation = useRef(0),
    saving = useRef(false);
  useInlineMotion(root, { editor, workspaceId, view, snapshot });
  const navigate = (action: () => void) => {
    if (editor) {
      setNotice("Finish or cancel the current change first.");
      return;
    }
    action();
  };
  const open = (state: InlineEditorState) => {
    if (editor) {
      setNotice("Finish or cancel the current change first.");
      return;
    }
    generation.current++;
    trigger.current =
      candidate.current ?? (document.activeElement as HTMLElement);
    setNotice("");
    setEditor(state);
  };
  const close = () => {
    generation.current++;
    setEditor(null);
    queueMicrotask(() => {
      if (trigger.current?.isConnected)
        trigger.current.focus({ preventScroll: true });
    });
  };
  const review = async () => {
    const r = await fetch("/api/workspace-access", { cache: "no-store" });
    const body = await r.json();
    if (!r.ok) throw Error(body.error ?? "Could not reload access.");
    const latest = body as AccessGraphSnapshot;
    applySnapshot(latest);
    setEditor((old) => (old ? { ...old, snapshot: latest } : null));
    return latest;
  };
  const save = async (input: AccessMutation) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    const requestGeneration = generation.current;
    try {
      const result = await onMutation(input);
      applySnapshot(result.snapshot);
      if (generation.current === requestGeneration) close();
      setNotice(
        input.type === "addPerson"
          ? "Account ready. They can sign in with their MASCA Google account; assign workspace access separately."
          : "Access saved.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const props = { onSave: save, onCancel: close, onReview: review, busy };
  const drag = useMemberDrag((personId, id, area) => {
    if (!snapshot || snapshot.mode !== "active" || editor) return;
    setWorkspaceId(id);
    open({ kind: "member", snapshot, workspaceId: id, area, personId });
  });
  const active = snapshot?.mode === "active";
  const details = (state: InlineEditorState) =>
    state.kind === "details" ? (
      <InlineMemberDetails
        snapshot={state.snapshot}
        personId={state.personId}
        workspaceId={state.workspaceId}
        onCancel={close}
        onEdit={(id) =>
          setEditor({ ...state, kind: "member", workspaceId: id })
        }
      />
    ) : null;
  const draggedPerson = snapshot?.people.find((p) => p.id === drag.drag?.id);
  return (
    <main
      ref={root}
      onClickCapture={(e) => {
        candidate.current = (e.target as Element).closest<HTMLElement>(
          "button",
        );
      }}
      onPointerDownCapture={(e) => {
        candidate.current = (e.target as Element).closest<HTMLElement>(
          "button",
        );
      }}
      className="access-graph"
    >
      <header className="ag-page-heading">
        <div>
          <h1>People & access</h1>
          <p>Choose a workspace to see who can use each tool.</p>
        </div>
        <div className="ag-view-toggle">
          <button
            type="button"
            aria-label="Bubble view"
            aria-pressed={view === "bubbles"}
            onClick={() => navigate(() => setView("bubbles"))}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            aria-label="Table view"
            aria-pressed={view === "table"}
            onClick={() => navigate(() => setView("table"))}
          >
            <Table2 size={17} />
          </button>
        </div>
      </header>
      {loading && (
        <div className="ag-skeleton" role="status" aria-label="Loading access">
          <div />
          <div />
          <div />
        </div>
      )}
      {error && (
        <div className="ag-error" role="alert">
          <p>{error}</p>
          <button type="button" className="ag-secondary" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {notice && (
        <p className="ag-notice" role="status">
          {notice}
        </p>
      )}
      {snapshot && !loading && (
        <>
          {snapshot.mode === "staged" && (
            <p className="ag-staged">
              Workspace access is staged. Memberships shown here will take
              effect after the rollout review; current legacy access remains in
              use.
            </p>
          )}
          <section className="ag-boundary">
            <header className="ag-boundary-heading">
              <img src="/logo/logo.webp" alt="MASCA" width="32" height="32" />
              <div>
                <h2>CMS administration</h2>
                <p>Platform management is separate from content access.</p>
              </div>
              <div className="ag-cms-actions">
                {active && snapshot.viewer.create && (
                  <button
                    type="button"
                    className="ag-text"
                    onClick={() => {
                      navigate(() => setView("bubbles"));
                      open({ kind: "workspace", snapshot });
                    }}
                  >
                    <Plus size={16} />
                    Add workspace
                  </button>
                )}
                {snapshot.workspaces.some((w) => w.status === "archived") && (
                  <button
                    type="button"
                    className="ag-text"
                    onClick={() => navigate(() => setArchived((v) => !v))}
                  >
                    {archived ? "Hide archived" : "Show archived"}
                  </button>
                )}
              </div>
            </header>
            {workspaceId && (
              <button
                type="button"
                className="ag-text ag-back"
                onClick={() => navigate(() => setWorkspaceId(null))}
              >
                <ArrowLeft size={15} />
                All workspaces
              </button>
            )}
            {view === "table" ? (
              <>
                <AccessTable
                  snapshot={snapshot}
                  onInspect={(id, personId) =>
                    open({
                      kind: "details",
                      snapshot,
                      workspaceId: id,
                      personId,
                      group: "table",
                    })
                  }
                />
                {editor?.group === "table" &&
                  (editor.kind === "details" ? (
                    details(editor)
                  ) : editor.kind === "member" ? (
                    <InlineMemberEditor context={editor} {...props} />
                  ) : null)}
              </>
            ) : (
              <div className="ag-workspaces">
                {editor?.kind === "workspace" && (
                  <InlineWorkspaceEditor
                    workspaces={snapshot.workspaces}
                    {...props}
                  />
                )}
                {snapshot.workspaces
                  .filter((w) => archived || w.status === "active")
                  .map((w) => {
                    const members = snapshot.memberships.filter(
                        (m) => m.committee === w.id,
                      ),
                      inside =
                        editor &&
                        "workspaceId" in editor &&
                        editor.workspaceId === w.id &&
                        !editor.group
                          ? editor
                          : null;
                    return (
                      <WorkspaceBubble
                        key={w.id}
                        workspace={w}
                        expanded={workspaceId === w.id}
                        connected={members.some(
                          (m) => m.userId === selectedPerson,
                        )}
                        count={members.length}
                        dropProps={
                          active && w.status === "active"
                            ? {
                                "data-drop-workspace": w.id,
                                ...(drag.target === `${w.id}:`
                                  ? { "data-drop-active": "true" }
                                  : {}),
                              }
                            : undefined
                        }
                        onOpen={() =>
                          navigate(() =>
                            setWorkspaceId(workspaceId === w.id ? null : w.id),
                          )
                        }
                        onAdd={
                          active && w.status === "active"
                            ? () =>
                                open({
                                  kind: "member",
                                  snapshot,
                                  workspaceId: w.id,
                                })
                            : undefined
                        }
                        onTools={
                          active && snapshot.viewer.configure
                            ? () =>
                                open({
                                  kind: "tools",
                                  snapshot,
                                  workspaceId: w.id,
                                })
                            : undefined
                        }
                      >
                        {active &&
                          snapshot.viewer.appoint &&
                          w.status === "active" && (
                            <button
                              type="button"
                              className="ag-text"
                              onClick={() =>
                                open({
                                  kind: "member",
                                  snapshot,
                                  workspaceId: w.id,
                                  manager: true,
                                })
                              }
                            >
                              <ShieldCheck size={15} />
                              Appoint access manager
                            </button>
                          )}
                        {inside?.kind === "tools" && (
                          <InlineToolsEditor
                            workspace={inside.snapshot.workspaces.find(
                              (x) => x.id === w.id,
                            )!}
                            {...props}
                          />
                        )}
                        {inside?.kind === "member" && !inside.area && (
                          <InlineMemberEditor
                            context={inside}
                            manager={inside.manager}
                            {...props}
                          />
                        )}
                        {inside?.kind === "details" &&
                          !inside.area &&
                          details(inside)}
                        <div className="ag-areas">
                          {w.areas.map((a) => (
                            <AreaBubble
                              key={a}
                              area={a}
                              members={members}
                              people={snapshot.people}
                              selectedPerson={selectedPerson}
                              onPerson={(personId) => {
                                setPerson(personId);
                                open({
                                  kind: "details",
                                  snapshot,
                                  workspaceId: w.id,
                                  area: a,
                                  personId,
                                });
                              }}
                              onAdd={
                                active && w.status === "active"
                                  ? () =>
                                      open({
                                        kind: "member",
                                        snapshot,
                                        workspaceId: w.id,
                                        area: a,
                                      })
                                  : undefined
                              }
                              dropProps={
                                active && w.status === "active"
                                  ? {
                                      "data-drop-workspace": w.id,
                                      "data-drop-area": a,
                                      ...(drag.target === `${w.id}:${a}`
                                        ? { "data-drop-active": "true" }
                                        : {}),
                                    }
                                  : undefined
                              }
                            >
                              {inside &&
                              "area" in inside &&
                              inside.area === a ? (
                                inside.kind === "member" ? (
                                  <InlineMemberEditor
                                    context={inside}
                                    {...props}
                                  />
                                ) : inside.kind === "details" ? (
                                  details(inside)
                                ) : null
                              ) : undefined}
                            </AreaBubble>
                          ))}
                        </div>
                        {!w.areas.length && (
                          <p>
                            No tools enabled yet. Enabling a tool assigns no
                            access.
                          </p>
                        )}
                      </WorkspaceBubble>
                    );
                  })}
                {!snapshot.workspaces.length && <p>No workspaces yet</p>}
              </div>
            )}
            <PeopleTray
              people={snapshot.people}
              selected={selectedPerson}
              onSelect={(id) => {
                if (editor) {
                  setNotice("Finish or cancel the current change first.");
                  return;
                }
                setPerson(id);
                if (id)
                  open({
                    kind: "details",
                    snapshot,
                    personId: id,
                    group: "people",
                  });
              }}
              onPointerDown={active ? drag.begin : undefined}
              suppressClick={drag.suppressClick}
            >
              {active &&
                snapshot.viewer.create &&
                editor?.kind !== "person" && (
                  <button
                    type="button"
                    className="ag-person"
                    onClick={() => open({ kind: "person", snapshot })}
                  >
                    <Plus size={17} />
                    Add person
                  </button>
                )}
              {editor?.kind === "person" && <InlinePersonEditor {...props} />}
              {editor?.group === "people" &&
                (editor.kind === "details" ? (
                  details(editor)
                ) : editor.kind === "member" ? (
                  <InlineMemberEditor context={editor} {...props} />
                ) : null)}
            </PeopleTray>
          </section>
        </>
      )}
      {drag.drag &&
        draggedPerson &&
        createPortal(
          <div
            className="ag-drag-avatar"
            style={{ left: drag.drag.x, top: drag.drag.y }}
          >
            <PersonAvatar person={draggedPerson} />
            {draggedPerson.name}
          </div>,
          document.body,
        )}
    </main>
  );
}
