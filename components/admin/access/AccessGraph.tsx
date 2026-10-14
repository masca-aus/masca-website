"use client";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Table2, Plus } from "lucide-react";
import type { AccessGraphSnapshot } from "@/features/access/workspaces/types";
import type { AccessMutation } from "@/features/access/workspaces/mutations";
import { useAccessGraph } from "./useAccessGraph";
import { AccessOverview } from "./AccessOverview";
import { PeopleTray } from "./PeopleTray";
import { AccessManagement } from "./AccessManagement";
import { AccessTable } from "./AccessTable";
import { InlineMemberEditor } from "./InlineMemberEditor";
import { InlineWorkspaceEditor } from "./InlineWorkspaceEditor";
import { InlinePersonEditor } from "./InlinePersonEditor";
import { InlineToolsEditor } from "./InlineToolsEditor";
import { InlineMemberDetails } from "./InlineMemberDetails";
import { AccessSaveError, type InlineEditorState } from "./inlineTypes";
import { useAccessClock } from "./useAccessClock";
import { useInlineMotion } from "./useInlineMotion";
import { MembershipRenewal } from "./MembershipRenewal";
import { MembershipRemoval } from "./MembershipRemoval";
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
  initialView = "manage",
  onMutation = writeMutation,
}: {
  initialSnapshot?: AccessGraphSnapshot;
  initialView?: "manage" | "bubbles" | "table";
  onMutation?: (
    input: AccessMutation,
  ) => Promise<{ snapshot: AccessGraphSnapshot }>;
}) {
  const { snapshot, loading, error, retry, applySnapshot } =
      useAccessGraph(initialSnapshot),
    [workspaceId, setWorkspaceId] = useState<string | null>(null),
    [selectedPerson, setPerson] = useState<string | null>(null),
    [view, setView] = useState<"manage" | "bubbles" | "table">(initialView),
    [archived, setArchived] = useState(false),
    [editor, setEditor] = useState<InlineEditorState | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [instructions, setInstructions] = useState("");
  const now = useAccessClock();
  const root = useRef<HTMLElement>(null),
    trigger = useRef<HTMLElement | null>(null),
    candidate = useRef<HTMLElement | null>(null),
    generation = useRef(0),
    saving = useRef(false),
    focusManagement = useRef(false);
  useEffect(() => {
    if (view === "manage" && focusManagement.current) {
      focusManagement.current = false;
      root.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    }
  }, [view, workspaceId]);
  useInlineMotion(root, { editor, workspaceId, view, snapshot });
  const navigate = (action: () => void) => {
    if (editor && editor.kind !== "details") {
      setNotice("Finish or cancel the current change first.");
      return;
    }
    if (editor?.kind === "details") {
      generation.current++;
      setEditor(null);
    }
    action();
  };
  const open = (state: InlineEditorState) => {
    if (editor && editor.kind !== "details") {
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
    const requestGeneration = generation.current;
    const opened = editor;
    const r = await fetch("/api/workspace-access", { cache: "no-store" });
    const body = await r.json();
    if (!r.ok) throw Error(body.error ?? "Could not reload access.");
    const latest = body as AccessGraphSnapshot;
    if (generation.current !== requestGeneration) return latest;
    if (opened && "workspaceId" in opened) {
      const workspace = latest.workspaces.find(
        (w) => w.id === opened.workspaceId,
      );
      if (
        workspace &&
        "area" in opened &&
        opened.area &&
        !workspace.areas.includes(opened.area)
      )
        throw Error(
          "This tool is no longer enabled. Close this form and review the workspace tools.",
        );
      const personId = "personId" in opened ? opened.personId : undefined;
      const person = !personId || latest.people.some((p) => p.id === personId);
      const needsMembership =
        ["renew", "remove", "details"].includes(opened.kind) ||
        (opened.kind === "member" &&
          opened.group === "manage" &&
          !!personId &&
          opened.snapshot.memberships.some(
            (m) => m.committee === opened.workspaceId && m.userId === personId,
          ));
      const membership =
        !needsMembership ||
        latest.memberships.some(
          (m) => m.committee === opened.workspaceId && m.userId === personId,
        );
      if (
        !workspace ||
        !person ||
        !membership ||
        (workspace.status !== "active" && opened.kind !== "tools")
      )
        throw Error(
          "This membership or workspace is no longer available. Close this form and review current access.",
        );
    }
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
      if (input.type === "addPerson")
        setInstructions(
          `Sign in to MASCA CMS at ${window.location.origin}/admin using ${input.email.trim().toLowerCase()} and your individual MASCA Google account. Workspace access is assigned separately by your access manager.`,
        );
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
  const active = snapshot?.mode === "active";
  const renderEditor = (state: InlineEditorState) => {
    if (state.kind === "workspace")
      return (
        <InlineWorkspaceEditor
          workspaces={state.snapshot.workspaces}
          {...props}
        />
      );
    if (state.kind === "person") return <InlinePersonEditor {...props} />;
    if (state.kind === "tools")
      return (
        <InlineToolsEditor
          workspace={
            state.snapshot.workspaces.find((w) => w.id === state.workspaceId)!
          }
          startArchive={state.startArchive}
          {...props}
        />
      );
    if (state.kind === "member")
      return (
        <InlineMemberEditor
          context={state}
          manager={state.manager}
          {...props}
        />
      );
    if (state.kind === "renew")
      return <MembershipRenewal context={state} {...props} />;
    if (state.kind === "remove")
      return (
        <MembershipRemoval
          context={state}
          areaOnly={state.areaOnly}
          {...props}
        />
      );
    if (state.kind === "details")
      return (
        <InlineMemberDetails
          now={now}
          editLabel={state.group === "manage" ? "Edit access" : undefined}
          snapshot={state.snapshot}
          personId={state.personId}
          workspaceId={state.workspaceId}
          area={state.area}
          onCancel={close}
          onEdit={(id) =>
            setEditor({ ...state, kind: "member", workspaceId: id })
          }
          onRenew={(id) =>
            setEditor({ ...state, kind: "renew", workspaceId: id })
          }
          onRemove={(id, areaOnly) =>
            setEditor({ ...state, kind: "remove", workspaceId: id, areaOnly })
          }
        />
      );
    return null;
  };
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
          <p>Manage members and tool access by workspace.</p>
        </div>
        <div className="ag-view-toggle">
          <button
            type="button"
            aria-label="Manage access"
            aria-pressed={view === "manage"}
            onClick={() => navigate(() => setView("manage"))}
          >
            <Table2 size={17} />
            Manage
          </button>
          <button
            type="button"
            aria-label="Bubble view"
            aria-pressed={view === "bubbles"}
            onClick={() => navigate(() => setView("bubbles"))}
          >
            <LayoutGrid size={17} />
            Overview
          </button>
          {view !== "bubbles" && (
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => navigate(() => setView("table"))}
            >
              <Table2 size={17} />
              Accounts & memberships
            </button>
          )}
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
      {instructions && (
        <div className="ag-signin-instructions">
          <p>{instructions}</p>
          <button
            type="button"
            className="ag-text"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(instructions);
                setNotice("Sign-in instructions copied.");
              } catch {
                setNotice("Copy the sign-in instructions shown here.");
              }
            }}
          >
            Copy sign-in instructions
          </button>
        </div>
      )}
      {snapshot && !loading && (
        <>
          {snapshot.mode === "staged" && (
            <p className="ag-staged">
              Workspace access is staged. Memberships shown here will take
              effect after the rollout review; current legacy access remains in
              use. Changes unlock after the access rollout review.
            </p>
          )}
          {view === "manage" ? (
            <AccessManagement
              snapshot={snapshot}
              now={now}
              workspaceId={workspaceId}
              onWorkspace={setWorkspaceId}
              archived={archived}
              onArchived={() => setArchived((v) => !v)}
              editor={editor}
              onOpen={open}
              onNavigate={navigate}
              renderEditor={renderEditor}
            />
          ) : view === "bubbles" ? (
            <AccessOverview
              snapshot={snapshot}
              now={now}
              workspaceId={workspaceId}
              onWorkspace={setWorkspaceId}
              archived={archived}
              onArchived={() => setArchived((v) => !v)}
              onManage={(id) =>
                navigate(() => {
                  focusManagement.current = true;
                  setWorkspaceId(id);
                  setView("manage");
                })
              }
            />
          ) : (
            <section
              className="ag-boundary"
              aria-label="Accounts and memberships"
            >
              <AccessTable
                now={now}
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
              {editor?.group === "table" && renderEditor(editor)}
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
                {editor?.group === "people" && renderEditor(editor)}
              </PeopleTray>
            </section>
          )}
        </>
      )}
    </main>
  );
}
