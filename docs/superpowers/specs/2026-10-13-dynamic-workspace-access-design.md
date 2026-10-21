# Dynamic MASCA workspaces and visual access

## Purpose and approved direction

Make access understandable to National administrators and committee managers through an expandable bubble overview. The user approved nested CMS, workspace and content-area bubbles, contextual + actions, committee and project workspaces, and the inline preview. The final UI direction replaces detached detail panes and stepped forms with editors that expand within the clicked workspace, content area or People group.

A manager should be able to answer who can work in an area, what they can do, and when access ends. Adding a workspace must not require editing a fixed list in the application. The visual represents the actual server policy; dragging or nesting alone does not grant authority.

The existing committee foundation and member-creation work remain staged behind COMMITTEE_ACCESS_ENABLED. This design does not activate delegation, assign live memberships or invent term dates.

## Approach

Use a persistent workspace catalogue with stable identifiers, explicit ownership and existing area-specific roles. Seed National and the eight existing state/territory committees; allow platform administrators to create additional committee or project workspaces.

Alternatives considered: keeping the fixed list would make each new workspace require a software release; an arbitrary nested hierarchy with inherited permissions would complicate delegation and could unintentionally expand access. Choose a flat workspace catalogue displayed through a layered visual. Project teams can optionally identify a sponsoring committee for context, without inheriting access or approval authority.

## Workspace model and lifecycle

Each workspace has an immutable ID, unique internal key, display name, kind (committee or project), status (active or archived), enabled content areas, and optional confirmed term-end default. Existing workspaces also retain their legacy committee code. Project workspaces may have a sponsoring committee. Sponsorship is descriptive only.

Only platform administrators create, rename, configure, archive or restore workspaces and appoint access managers. Workspace managers assign Viewer, Editor and Approver roles within their own active workspace, bounded by their own manager membership expiry. They cannot appoint managers or administer another workspace.

New workspaces start with no members, managers or content grants. Creation inserts an editable workspace card among the workspace bubbles with name, kind, enabled existing areas and a visible creation summary; administrators then appoint managers and add memberships with confirmed dates. A workspace can exist before a term is confirmed, but saving a membership always requires an explicit valid expiry. A confirmed workspace term may prefill that date and remains visible for review. Creating a workspace or enabling an area does not assign access.

Enable only implemented content areas: Events, Careers, Committee profiles, Sponsors, Organisations, Media library and Media calendar. Dynamic workspace creation does not create a new software module. Content-type labels such as MASA remain organisational tags unless an administrator intentionally establishes an independent project workspace.

Archive rather than permanently delete a workspace. Archiving stops private content access, record sharing, collaboration and further writes while preserving records, attribution and audit history. Public website visibility remains controlled by each record's publication state. Restoring a workspace does not renew expired memberships.

## Bubble overview

The outer CMS boundary represents platform management. Workspace bubbles sit inside it; expanding one reveals its enabled areas and members. Platform authority is labelled separately from content roles.

Initial view shows active workspaces available to the viewer. Platform administrators may inspect access metadata across workspaces, including archived entries, without receiving private content access. Managers see access metadata for the workspaces they manage. Ordinary members see their own workspace choices and permitted content navigation, not the complete administration overview.

Expand one workspace at a time and use a breadcrumb to return to the overview. Within it, area bubbles show member photos or initials and role badges. Large groups show a readable subset and a labelled additional-member count that opens the member list. Use responsive wrapping and inline detail cards rather than shrinking labels or requiring a free-pan canvas. Selecting an area expands that bubble in its existing group. Viewing or editing a person stays inside the group where they were selected; no independent sidebar or editor appended after the map. Bubble size has no permission meaning.

Selecting a person highlights their authorised paths within the viewer's visibility. Selecting a membership expands role, expiry and grant-history details inline. Close and Cancel collapse the expansion without a write; no overlay or browser confirmation is used. Record-level sharing appears in a separate shared-record section, labelled distinctly; it does not place someone in a workspace membership bubble. Account suspension and membership expiry are separate states and use explicit text, not colour alone.

Provide a table view using the same access data for comparing members and operating comfortably on small screens. Keep an ordinary member picker as a complete alternative to drag and drop.

## Contextual + journeys

### CMS layer

The + menu offers Add workspace and Add person to platform administrators. Add person establishes an approved individual MASCA account and then offers optional workspace membership setup; account creation alone gives no content rights. Platform administration is a separate deliberate action outside ordinary member setup.

### Workspace layer

The + button means Add member to this workspace. Prefill and show the workspace. Pick an existing person or enter an individual MASCA email through the existing approved-account/delegation flow, rendered inside the workspace. Account creation in the CMS layer expands an inline name/email row in the People group. Existing accounts receive another membership rather than a duplicate account. Choose area roles and confirm term expiry in an inline workspace editor. The plain-language summary is visible alongside the editable fields; Save commits once. There is no separate review screen.

### Content-area layer

The + button means Add person to this area. Prefill and show both workspace and area. Expand that area bubble into an inline card. Put person and role side by side on desktop, stack on phones, then show the term and a compact live access summary underneath. Save commits the reviewed values once; Cancel returns to the bubble. An existing workspace membership gains only the selected area role; all other roles and memberships remain unchanged. When creating the person's first membership here, require its term explicitly.

Membership expiry applies to the whole workspace membership. If a person already has membership, show its existing expiry; extending it is an explicit renewal action affecting every assigned area. Never silently extend the term while adding an area.

Each + has a descriptive accessible label and tooltip. Menus offer only actions the current actor is permitted to take. A person avatar opens details rather than an additional ambiguous + action.

### Drag and drop

Drag a member onto a workspace or area as a shortcut to the same contextual inline editor. Show a visible dragged avatar, smooth target feedback and a preview of the proposed assignment. Dropping fills in context but does not save permissions. Role and term review precede the final Add access button.

Adding access preserves the person's other area roles. Removing access uses a separate explicit action and clearly states its scope. A failed save leaves the setup intact with an inline error; a stale revision prompts refresh and re-review. Click, keyboard and touch journeys achieve every drag action. Honour reduced-motion settings and keep form focus indicators quiet but visible.

## Manage tools inline

Workspace configuration is an explicit platform-administrator action, distinct from assigning people. Manage tools expands a checkbox editor within the selected workspace. Enabling Events creates its area bubble with zero new member grants. A visible summary identifies newly enabled or disabled areas before Save tools. Existing roles and membership dates are unchanged. Disable an area only when it has no assigned roles; otherwise explain that its memberships must be reviewed first. Never silently discard or reactivate roles by toggling tools.

## Theme, motion and performance

Use the existing MASCA CMS font, logo, navy primary actions, neutral surfaces, modest corner radii and monochrome icons. Respect the CMS light/dark theme. Use the existing custom select and compact date picker; avoid browser-native dropdown presentation. Keep a subtle keyboard focus indicator and do not select input text or add oversized coloured focus rings on open.

Animate inline expansion, collapse, target feedback and neighbouring bubble movement with short transitions around 160–200ms. Preserve card positions, prevent accidental text selection during dragging, and honour reduced motion. Close controls and Escape must remain functional; Escape closes a picker first and otherwise cancels the inline editor. Move keyboard focus back to the triggering control on close without selecting its text.

Load access metadata once for the viewer, then expand cards from that local snapshot. Do not refetch the full graph when opening or changing a field. Lazy-load grant history and record-sharing details only when inspected. Save through server-authorised mutations with revision checks, update affected state from the response, and reconcile failures inline. Keep an edit intact after errors or stale revisions and require review before retrying. Protect unsaved fields from background refreshes and rapid navigation. A disabled workspace or revoked manager term cannot be saved using stale client state.

## Member setup and handover

Use shared member fields and policy for main account creation and scoped inline assignment. Bubble interactions show Person, Access and Review together in one inline editor rather than as separate steps. Keep the native main account editor compatible while making People & access the primary entry point for day-to-day membership work. Existing-account matches show current permitted membership details and preserve unrelated access. Account configuration, access manager appointment and platform roles remain distinct from content role choices.

A completed summary states the person, workspace, area roles and expiry. New roles default to Viewer until deliberately changed. Save once from the inline editor with its current access summary visible. No invitation email is implied or sent; successful creation offers copyable Google sign-in instructions. Existing Google sign-in remains unchanged.

Managers can edit area access, renew terms and remove a workspace membership. Account suspension remains platform-only. Existing 30/7-day term reminders follow dynamic workspace IDs and continue to preserve attribution when access expires.

## Authority and data changes

Replace the fixed nine-scope membership constraint with membership references to active catalogue entries. Validate all workspace IDs, area enablement, roles and expiry on the server. Use bounded request sizes, unique memberships per person/workspace and the existing atomic revision/audit mechanism. Never accept an unknown ID just because a client rendered it.

Add canonical workspace ownership to working content. Media, comments, revisions, notifications and live collaboration derive scope from their owning record. Sharing remains Viewer/Editor for a particular record, requires an active owning workspace, and grants no approval, deletion or management authority.

Public state/location fields and legacy committee labels remain available for website routing and geography; they are not authoritative permission fields after migration. All policy consumers, including dashboard counts, search, uploads, downloads, calendar APIs and presence, resolve the canonical workspace consistently. Author/contributor self-approval remains blocked and substantive edits invalidate approval. Calendar approval continues to support manual Instagram posting.

Use the existing central policy and current session account checks; extend them rather than add a second permission system. Archived/expired/suspended/revoked access takes effect on subsequent API and collaboration checks. Showing the outer admin cloud never bypasses content permission checks.

## Migration and rollout

1. Add and seed the catalogue with deterministic legacy mappings. Add workspace ownership fields and indexes without changing current public or National workflows.
2. Rehearse backfilling each existing membership and owningScope to its exact workspace. Preserve expiry strings, grants, creator/contributor history and record sharing. Report unmatched references, unreviewed broad legacy grants and missing terms; do not infer dates.
3. Switch policy and all integrations to canonical workspace ownership together in the staged environment. During preparation, legacy records resolve through the seeded mapping; unknown or conflicting references fail closed. Require complete mappings before activation.
4. Release the access overview and shared inline/contextual forms, then enable dynamic workspace creation after ownership and delegation acceptance checks pass. State delegation remains subject to the existing rollout review.

Renaming a workspace cannot alter ownership because IDs remain stable. Preserve public publication state and existing public submission ownership routing. Preview and production use the same catalogue model with their existing environment isolation. Once project-owned records exist, rollback must retain workspace-aware enforcement; reverting to the old fixed-scope policy is not a safe rollback. Use an earlier compatible build or disable workspace creation while repairing a regression.

## Acceptance checks

- An admin creates a project workspace without changing code; it appears in the overview and correct workspace switchers after authorised memberships are saved.
- A new or renamed workspace does not create permissions, inherit sponsor committee rights, alter public location routes or change record ownership.
- A QLD manager cannot administer VIC, National or another project, appoint managers, or change platform roles.
- Area + and drag/drop propose the same assignment and require review before a write. Adding an area preserves unrelated roles and membership expiry.
- Existing people are reused; no duplicate account is created. An account without content membership has no private content rights.
- Private links, guessed IDs, search, file routes and live collaboration enforce the same workspace boundaries.
- Map, table, counts, member pickers and sharing sections match actual accessible grants and distinguish account status from membership expiry.
- Archive, expiry, suspension and revocation stop subsequent private/collaboration access; history remains and public publication behavior is preserved.
- Self-approval and review invalidation continue to work across committee and project workspaces.
- Inline creation, tool configuration, role editing, renewal and removal work at 375px, by keyboard, without drag, and with reduced motion. Names and role labels stay legible as the workspace catalogue grows.
- Editors appear inside the clicked context, and saving/cancelling collapses them without opening a detached pane or stepped review screen. Enabling Events for MASA grants no member access until a separate explicit role save.
- Existing dates and unrelated roles survive area assignment, field changes, failed saves and stale revision handling.
- Migration preserves all reviewed existing National/state workflows and rejects unmatched or contradictory ownership data.
