# Inline Workspace Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development if the user selects that method. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved inline bubble interface backed by dynamic committee/project workspaces and the same server-enforced access policy used throughout the CMS.

**Architecture:** Persist a workspace catalogue and use its immutable IDs as canonical content owners. Keep existing membership JSON and `owningScope` contracts, replacing their fixed-scope restriction with catalogue validation and widening the ownership storage from enum to text. Load a current policy catalogue on server entry points; expose only authorised workspace names and access metadata to clients. Build the inline editors from shared fields and scoped mutation services rather than a separate UI permission system.

**Tech Stack:** Next.js 16.3.4, React 19.2.4, Payload 3.86, TypeScript, PostgreSQL/pg, Lucide, existing custom selects/date picker, Vitest/Testing Library, existing account-photo endpoints. No new animation or drag dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-dynamic-workspace-access-design.md`

## Global Constraints

- Use the approved `inline-access-preview.html` for interaction/layout reference; use real CMS theme tokens, typography, logo and monochrome icons in production.
- Retain individual `@masca.org.au` Google sign-in, separate platform/content authority, bounded manager delegation, Viewer defaults and explicit expiry.
- Existing National/state IDs remain exactly `National`, `QLD`, `NSW`, `VIC`, `ACT`, `SA`, `WA`, `TAS`, `NT`. New IDs use `ws-` plus a UUID and never change on rename.
- Geography and public website state labels retain the existing fixed National/state vocabulary. In committee mode, `owningScope` stores an immutable workspace owner ID, not a display name; legacy mode cannot grant content rights to a project ID.
- Respect COMMITTEE_ACCESS_ENABLED staging, preview schema isolation and existing legacy/public workflows. Do not enable production delegation or invent dates/managers.
- One membership per person/workspace; structural membership validation is bounded at 100 memberships. Known archived workspaces remain valid historical references but confer no active authority.
- Enabling a tool grants nobody access. Reject disabling an area with assigned roles, including expired memberships; preserve history through explicit removal/renewal.
- No self-approval, no publication via record sharing, no automatic Instagram publication. Author/contributor edits invalidate approval.
- Inline summaries precede one explicit Save. Dropping only opens an editor. Preserve unrelated memberships, area roles and exact existing expiry; renewal is a separate explicit action.
- Use 160–200ms transitions, reduced-motion support, ordinary keyboard/touch controls, neutral focus indicators and functional Cancel/X/Escape. No automatic text selection.
- Tests use named localhost-only databases with synthetic accounts. Never reuse sample dates or identities as production grants.

## Review Focus

1. A manager expires or a workspace is archived while an editor is open: saving and subsequent collaboration must reject stale authority (Tasks 2–4, 6).
2. Simultaneous member updates, duplicate emails or double saves: exact revision checks, one account and atomic audit; unrelated grants survive (Tasks 3, 6).
3. A renamed/new workspace owns a published record and private asset: IDs remain stable, public publication is preserved and private file/calendar access stays scoped (Tasks 1, 4, 8).
4. Loading failures or background refresh during editing: no misleading empty graph, no erased input, no stale response reopening/closing an editor (Tasks 5–6).
5. Staged/legacy deployment or attempted rollback after project content exists: no accidental activation or broad legacy fallback exposing project working content (Tasks 1–4, 8).

## File and interface map

- `features/access/workspaces/types.ts`: shared catalogue and graph DTOs. `WorkspaceId = string`; `AccessWorkspace = {id,name,kind:'committee'|'project',status:'active'|'archived',areas:CommitteeArea[],termEnd:string|null,sponsorId:WorkspaceId|null,revision:string}`. `PolicyWorkspace = Pick<AccessWorkspace,'id'|'status'|'areas'>`.
- `features/access/workspaces/schema.ts`: `workspaceCatalogSchemaSQL(schema, calendarSchema): string`, seeded IDs, canonical ownership constraints and indexes.
- `features/access/workspaces/repository.ts`: `loadWorkspaceCatalog(client?): Promise<AccessWorkspace[]>`, transactional create/configure/archive/restore and audit.
- `features/access/workspaces/policyContext.ts`: `withWorkspaceAuthority<T extends CommitteeAccount>(account:T,catalog:PolicyWorkspace[]): T & {accessCatalog:PolicyWorkspace[]}`; server loads catalogues, pure policy consumes the snapshot. This runtime field is not accepted from client writes or stored as account authority.
- `features/access/workspaces/graph.ts`: `accessSnapshot(actor): Promise<AccessGraphSnapshot>` with viewer capabilities, authorised workspace summaries, people/memberships, revision and staged/active mode. Names/photographs are restricted to authorised access metadata; content titles are never loaded by a management-only actor.
- `components/admin/access/`: graph controller, workspace/area bubbles, inline member/tool/workspace/person editors, table, history/sharing sections and motion/drag helpers. `PeopleAccess.tsx` becomes the route wrapper.

### Task 1: Catalogue, stable ownership and migration

**Files:** Create `features/access/workspaces/types.ts`, `schema.ts`, `repository.ts`, `migrations/20261014_010000_workspace_catalog.ts`, `tests/workspaceCatalog.test.ts`, `tests/workspaceCatalogDatabase.test.ts`. Modify `migrations/index.ts`, `features/access/delegatedAccess.ts` table allowlist, rehearsal scripts and rollout documentation.

**Interfaces:** Produce the types and `workspaceCatalogSchemaSQL`/`loadWorkspaceCatalog` above. Repository calls `accessPool()`/`workspaceTable()` using the current isolated schema; no user-supplied table names.

- [ ] Write failing tests for idempotent seed, immutable IDs, unique names, malformed areas and reversible archive. In the disposable DB, seed a QLD draft/version/file and assert ownership/publication fields and timestamps are preserved after migration. Assert a missing catalogue owner cannot be persisted.
- [ ] Run `npx vitest run tests/workspaceCatalog.test.ts tests/workspaceCatalogDatabase.test.ts --maxWorkers=2`; witness failure before implementation, then repeat with its guarded localhost URI.
- [ ] Implement catalogue validation (trimmed name 1–80 characters, existing area keys only, valid kind/status/term/sponsor), seed all nine legacy IDs with no invented term and all currently implemented areas. New workspaces start with explicit chosen areas and no memberships. Convert existing `owning_scope` and version ownership columns to text while preserving their defaults/data; add catalogue foreign keys/indexes. Enforce calendar JSON owner validity using stored generated owner columns/foreign keys and the existing parent relationships for associated assets/comments/history.
- [ ] Verify migration reruns do not overwrite renamed workspaces, terms or tools, and that public/preview schemas remain separate. Rollback preserves catalogue/grants/audit; never drop project ownership data or suggest reverting to the fixed-scope policy.
- [ ] Commit the tested catalogue/migration foundation.

### Task 2: Central authority for dynamic workspaces

**Files:** Modify `features/access/committeePolicy.ts`, `workspacePolicy.ts`, `committeeEnvironment.ts`, `workspaceSession.ts`, `configureWorkspace.ts`, `committeeContent.ts`, `committeeMigration.ts`, `committeeAudit.ts`, `committeeReminders.ts`; create `features/access/workspaces/policyContext.ts`, `tests/dynamicWorkspacePolicy.test.ts`.

**Interfaces:** Preserve public policy function names and membership storage property `committee`, widening `CommitteeScope` to `WorkspaceId`. `validMemberships(value,catalog?)` checks known IDs including historical archived entries; `activeMemberships` and resource access require active/enabled catalogue entries. Keep the legacy scope constants for geography and legacy grant validation.

- [ ] Write failing tests: project editor can edit its enabled Events area, cannot access QLD Events, cannot access its disabled Careers area, and loses shared/private access on archive. Platform administrator without content membership still cannot edit. Unknown workspace/context fails closed. Test foreign workspace changes hidden in a membership array are rejected.
- [ ] Run `npx vitest run tests/dynamicWorkspacePolicy.test.ts tests/committeeAccess.test.ts tests/workspacePolicy.test.ts tests/workspaceSession.test.ts --maxWorkers=2` and record failures.
- [ ] Load current catalogue authority during sign-in request checks and inside locked repository operations; never trust a client snapshot. Make delegation and audit enumerate the union of actual membership IDs rather than the fixed nine. Apply the catalogue to content fields/hooks, ownership immutability, active record sharing, review policy and reminders. Expose authorised display names separately from the minimal policy context. Protect context fields against Payload create/update writes.
- [ ] Repeat tests for expired/suspended accounts, contributor self-approval and approval invalidation. Extend activation validation to catalogue ownership and actual dates. Retain legacy rules and reject legacy project grants; guard unsupported rollback from exposing project records.
- [ ] Commit unified dynamic authority.

### Task 3: Scoped metadata and mutations

**Files:** Create `features/access/workspaces/graph.ts`, `mutations.ts`, `app/api/workspace-access/route.ts`, `app/api/workspace-access/history/route.ts`, `tests/workspaceAccessRoute.test.ts`, `tests/workspaceAccessMutationsDatabase.test.ts`. Modify `features/access/delegatedAccess.ts`, existing people route, account configuration and catalogue repository.

**Interfaces:** `AccessGraphSnapshot` contains `{mode,viewer,workspaces,people,memberships,revision}`. Viewer capabilities explicitly state create/configure/appoint permissions. `AccessMutation` is a discriminated union of createWorkspace, configureWorkspace, archiveWorkspace, restoreWorkspace, addPerson, assignArea, removeArea, saveMembership, renewMembership and removeMembership. Each existing-object mutation requires its expected revision. `mutateAccess(actor,input): Promise<{snapshot:AccessGraphSnapshot}>` rechecks authority and returns reconciled authorised metadata.

- [ ] Write failing route/DB tests: QLD manager sees only managed QLD metadata, cannot appoint managers or create/configure VIC; platform actor sees management metadata without draft text. Concurrent same-revision updates produce one success and one conflict. Adding Events to MASA creates zero grants; assigning Syed Editor preserves his Media calendar role and exact existing expiry. Duplicate normalized email reuses the account; account-only creation confers no content rights.
- [ ] Run the new tests with their guarded localhost database and `npx vitest run tests/workspaceAccessRoute.test.ts --maxWorkers=2`; confirm RED.
- [ ] Implement bounded input validation, same-origin mutation checks, row locks/current actor catalogue re-read, compare-and-swap revisions and atomic account/workspace audits. Add optional display name (bounded at 80) without changing email identity. Managers can only add/reuse reviewed or newly invited MASCA accounts through bounded memberships; platform account suspension/manager appointments remain separate actions. Preserve old people-route compatibility.
- [ ] Verify archived/expired/revoked actors cannot commit after opening a form. Reject tool removal with assigned roles; return conflict/error without partial writes. Stage metadata/legacy review is explicit and administrator-only; dynamic content/delegation mutations require completed rollout. No automatic invitation email.
- [ ] Commit authenticated access services.

### Task 4: Wire real content, calendar and navigation

**Files:** Modify `features/mediaCalendar/{types,validation,policy,repository,collaboration,service,assets}.ts`, `app/api/media-calendar/route.ts`, `app/api/committee-media/route.ts`, `features/dashboard/{teamDashboard,dashboardContent,dashboardTasks}.ts`, `components/admin/{DashboardBranchPicker,MascaNav,MascaDashboard,CommitteeMemberships}.tsx`, `components/admin/mediaCalendar/{CalendarView,CalendarSidebar,RoomPresence}.tsx`; add a shared `components/admin/access/WorkspaceSelect.tsx`. Extend `tests/mediaCalendar/committeeDatabase.test.ts`, `scripts/check-committee-cms.mts` and dynamic dashboard tests.

**Interfaces:** Use Task 2 authority and Task 1 catalogue. `WorkspaceSelect` consumes `{value,options:{id,name}[],onChange,disabled?}` using the existing custom select. Creation defaults use authorised workspace IDs; geography remains a separate fixed vocabulary.

- [ ] Write failing integration assertions: a custom Events editor gets only project counts/results/media and cannot guess another workspace's private IDs; calendar lists, teammate mentions, presence, downloads and uploads revoke after archive/removal. Test independent publication and shared-record access on a project-owned post/event, and a renamed workspace keeping every record owner.
- [ ] Run focused dashboard/calendar tests and the actual Payload harness in its named localhost example database; record failing custom-workspace assertions.
- [ ] Replace fixed enum parsing with bounded workspace-key parsing plus current server catalogue checks. Reload authority for every calendar participant and mutation transaction. Populate custom ownership fields/selectors with authorised names, encode IDs in links, and preserve public submission defaults and published website queries. Do not let project IDs become public geographic labels.
- [ ] Verify National/state fixtures and legacy mode still pass alongside project workflows. Self-approval, contributor changes and sharing removal retain existing behavior.
- [ ] Commit integration wiring before the UI becomes writable.

### Task 5: Real bubble overview and loading flow

**Files:** Create `components/admin/access/{AccessGraph,WorkspaceBubble,AreaBubble,PeopleTray,AccessTable}.tsx`, `useAccessGraph.ts`, `accessGraph.css`, `tests/accessGraph.test.tsx`. Modify `PeopleAccess.tsx`, admin sidebar entry and import map.

**Interfaces:** `useAccessGraph(): {snapshot,loading,error,retry,applySnapshot}` loads Task 3 DTO once. `AccessGraph` uses a discriminated inline-editor state keyed by workspace/area/person IDs, never display names. Keep graph/table on the same snapshot.

- [ ] Write failing component tests for authorised workspace visibility, expanding from cached data without a second request, accurate counts/status labels, empty versus failed loading, renamed labels and staged-mode explanation. Assert display-name changes do not alter selection/record IDs.
- [ ] Run `npx vitest run tests/accessGraph.test.tsx --maxWorkers=2`; confirm RED.
- [ ] Implement the CMS management boundary, workspace/area bubbles, member photos/initials, one expanded workspace, selected-person highlights and table alternative. Use current CMS logo/theme/font and neutral focus styles. Show a shape-stable initial skeleton; prevent full graph refreshes on opens/field changes. Managers see no global platform controls.
- [ ] Verify 375px reflow, readable labels/counts, explicit inactive/suspended/expired status, accessible buttons, no horizontal clipping and no accidental text selection. Staging distinguishes proposed memberships from current legacy authority.
- [ ] Commit themed overview.

### Task 6: Contextual inline edits, motion and drag

**Files:** Create `components/admin/access/{InlineMemberEditor,InlineToolsEditor,InlineWorkspaceEditor,InlinePersonEditor,InlineMemberDetails}.tsx`, `membershipEdits.ts`, `useInlineMotion.ts`, `useMemberDrag.ts`, `tests/inlineAccessJourney.test.tsx`; reuse `MembershipEditor`, `memberPresentation.ts`, custom select/date picker.

**Interfaces:** Editors take actor capabilities, workspace, current membership/revision, `onSave(AccessMutation)` and `onCancel`. `assignArea(existing,area,roles)` merges only that area; the existing expiry is retained. `renewMembership` is a separately labelled inline operation. `useMemberDrag` opens an editor and never calls a mutation itself.

- [ ] Write failing real-component tests: area +/drop opens inside that area; person/role/date and live summary appear together; no mutation occurs before Save. Cancel/X/Escape closes and returns focus. Enable Events inline, then assign access without losing other roles or expiry. Rejected save/conflict preserves fields; a revoked manager and double click cannot produce an unauthorised/duplicate save.
- [ ] Run `npx vitest run tests/inlineAccessJourney.test.tsx tests/memberCreation.test.tsx --maxWorkers=2`; confirm RED.
- [ ] Implement inline placement from the approved preview: workspace creation among bubbles, account creation in People, tool/member configuration within a workspace, and area assignment/details replacing the clicked bubble with a compact card. Show platform/manager actions only where allowed. Saving uses Task 3 revisions/response rather than refetching the graph. Protect dirty input from background updates and provide explicit conflict review/retry.
- [ ] Add 160–200ms layout expansion/collapse and neighbour motion, reduced-motion fallback, visible dragged avatar/target feedback and complete click/keyboard/touch alternatives. Pickers close before the editor on Escape. Avoid opening autofocus selections or oversized coloured rings. Test rapid open/close and post-drag close behavior.
- [ ] Commit inline journeys and motion.

### Task 7: History, sharing and handover details

**Files:** Create `components/admin/access/{AccessHistory,SharedAccessSection,MembershipRenewal}.tsx`, `tests/accessHistoryAndSharing.test.tsx`; modify existing reminders and account/member links as needed.

**Interfaces:** Lazy detail routes consume the same actor/workspace policy. History returns authorised actor/action/term metadata; shared records use record IDs/area and expose content titles only when the actor separately has content rights. Sharing edits remain through the existing authorised record-sharing service.

- [ ] Write failing tests for scoped audit visibility, manager renewal capped by current manager term, removal retaining other memberships/history, lazy detail loading and suspension distinct from expiry. Verify a management-only actor never receives private captions/draft titles.
- [ ] Run focused tests; confirm RED.
- [ ] Implement in-place role/term/history inspection, explicit renewal/removal summaries and independently labelled record sharing. Preserve 30/7-day reminders and Google sign-in instructions. Keep global account suspension/administration in administrator-only settings.
- [ ] Repeat privacy/handover tests and commit.

### Task 8: Rehearsal, review and usual preview release

**Files:** Extend `scripts/check-committee-cms.mts`, `scripts/check-committee-access.mjs`, migration/activation verification and committed rollout instructions; regenerate `app/(payload)/admin/importMap.js` and Payload types with the staged collection shape.

- [ ] Add final migration checks for archived/project ownership, foreign private files, current-public-version preservation, no guessed term dates, activation prerequisites and unsupported rollback. Use exact named localhost database guards; never run synthetic writes on remote databases.
- [ ] Run the complete suite with `npm test -- --maxWorkers=2`, `npm run typecheck`, changed-file eslint, and `npm run build` under bundled Node 24. Run all relevant real PostgreSQL/actual Payload rehearsals separately because optional database tests are skipped in the ordinary suite.
- [ ] Have a fresh reviewer inspect the complete implementation against the spec and boundary tests; resolve actionable findings and rerun affected checks. No integration while required checks fail.
- [ ] Browser-check real CMS flows at desktop and 375px with isolated synthetic accounts: create workspace, enable Events, add/reuse member, pick role/date, save, renew/remove, drag/cancel, stale save, loading failure and reduced motion. Capture useful screenshots; clear the test session/reset viewport/close temporary tabs.
- [ ] Update existing PR #58 and push to its existing `codex/media-calendar` preview branch. Verify the exact commit's Vercel deployment is READY and reassign the usual workspace-access/listing preview aliases. Keep existing OAuth settings. Report staged versus active features accurately; do not merge main or enable live committee delegation without its separate rollout requirements.

## Self-review outcome

All approved journeys have a task: dynamic workspace lifecycle (1/3/6), consistent area authority and ownership (2/4), themed bubble/table navigation (5), in-place creation/assignment/tool editing and drag (6), history/sharing/handover (7), and migration/public/legacy compatibility plus release (8). The five Review Focus failure classes are pinned to tests in those tasks. UI name/email fields are display/identity input only, and all mutable access state uses immutable IDs and server revisions.
