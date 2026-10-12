# MASCA Media Calendar Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement this plan task-by-task. Native implementation in the current chat is recommended, followed by independent review.

**Goal:** Give National media members a fast private calendar for preparing, coediting and independently approving Instagram content.

**Architecture:** Custom Payload admin view, server-authoritative Postgres data and private media storage. Yjs merges simultaneous caption edits. Supabase private Realtime carries accepted updates and ephemeral presence; it does not replace durable server writes.

**Tech stack:** Existing Next.js/Payload/React/Postgres/S3 stack; pinned Yjs, y-protocols, CodeMirror 6, y-codemirror.next and Supabase client dependencies. CodeMirror is configured as a plain multiline caption editor without code syntax, line numbers or developer UI.

**Spec:** ../specs/2026-10-10-media-calendar-design.md

## Global constraints
National workspace only. CMS login is retained. No Meta API, automated publishing, metrics, generic tasks/meetings or Sheets import. Keep original MASCA branding, existing light/dark themes and mobile access. Never put unpublished assets in the public website media bucket. No public Realtime channels or browser service credentials.

## Review focus
- A revoked member must not keep writing through a cached collaboration session.
- Unacknowledged edits must survive a reconnect and remain recoverable if review locks the post.
- A concurrent caption write must never silently retain an approval for old content.
- Unpublished asset URLs and thumbnails must remain protected.
- Date dragging across timezones must retain the intended calendar day.

## Task 1 — Private workspace and durable model
**Files:** new `features/mediaCalendar/{types,policy,collections,schema}.ts`; update workspace access configuration, Payload config and permission controls; new migrations and policy/schema tests.
**Interfaces:** `CalendarAccess { view, edit, approve, designation: 'member' | 'chair' | null }`; `mayUseCalendar(user, capability)`; Post, Category, Comment, Revision, Notification and Asset types. Calendar access is a new administrator-managed group, separate from public Media access. Administrators may administer and preview the workspace; approval additionally requires member/chair designation and independent-review eligibility.

- [ ] Write failing tests for inactive/non-domain/anonymous users, explicit grants, admin-only grant changes, category editing for members and independent approval eligibility.
- [ ] Run tests and verify failure, then implement access functions and protected collections. Collections deny direct writes for workflow/audit/CRDT fields; all mutations use the action service.
- [ ] Post stores title, content type (feed/carousel/reel/story), category, planned timestamp or null, preparation date, creator, owner, collaborators, checklist, links, hold flag/reason, status, metadata version, content revision, caption state and contributors. Add indexes for planned timestamp/status/category and post foreign keys. Posted snapshots are immutable.
- [ ] Add chronological migrations and isolated preview schema setup. Seed categories once; never on every application request. Existing users receive no implicit calendar editor grant.
- [ ] Verify policy/schema tests, generated types/import map and TypeScript; commit this unit in the isolated calendar branch.

## Task 2 — Authoritative actions, review and discussion
**Files:** new `features/mediaCalendar/{service,validation,repository}.ts`; authenticated `/api/media-calendar` routes; action/concurrency tests.
**Interfaces:** calendar GET takes visible date range, category/status filters and cursor; detail GET returns post and revision. Authenticated mutations: create, patch(expectedVersion), caption update(binary base64), request review(expected content revision), withdraw, request changes, approve(expected content revision), mark posted, duplicate, category management, comment/resolve and notification read.

- [ ] Test stale writes, invalid transitions, missing media on review, self/contributor approval, two concurrent approvals, caption/media invalidation, hold preservation and posted immutability before implementation.
- [ ] Use one Postgres transaction and row lock for each mutation of a post. Merge Yjs updates in that transaction and attribute actual changed content to the authenticated writer. Unchanged replayed updates are idempotent and add no contributor.
- [ ] Keep contributors cumulative for each review revision, including creator. Request review persists a checkpoint and freezes content; approve checks current revision and excludes contributors. Withdraw/request changes reopens content. Changes to approved caption/media reopen Draft and clear approval atomically.
- [ ] Metadata writes use version comparison; return 409 with current version without destroying local edits. Dates do not increment content revision. Verify ISO timestamps, plain captions ≤2200 characters at review (drafts may exceed with a warning), valid colour strings and HTTPS published/reference links.
- [ ] Persist comments and in-app notifications for mentions, review requests and changes requested. Every read/write rechecks current CMS account permission. Require same-origin mutations and bounded input sizes. History checkpoints every 30 seconds while changed and at workflow transitions; do not store every keystroke as a revision.
- [ ] Verify endpoint and database concurrency tests in preview, then commit.

## Task 3 — Private direct uploads
**Files:** new `features/mediaCalendar/{assets,uploadPolicy}.ts`; authenticated asset endpoints; client upload hook and tests.
**Interfaces:** initialise upload → short-lived single-object signed upload; finalise upload → verified private asset ID; authorised preview/download → short-lived signed read. Upload and attachment finalisation each recheck calendar edit permission.

- [ ] Test anonymously denied reads/uploads, foreign object keys, expired links, spoofed file types, interrupted uploads, attachment conflicts and limits before implementation.
- [ ] Use separate preview/production private buckets with no public read policy. Unique server-generated object keys; validate actual object metadata on finalisation. Supported images JPEG/PNG/WebP and videos MP4/QuickTime. Reject SVG and unsupported formats with plain guidance. Initial limits: images 20MB, videos 250MB, 10 attachments/post; validate limits again on finalisation.
- [ ] Browser paste/drop/select creates immediate object-URL previews and a three-upload queue with progress, cancellation and per-file Retry. A upload acknowledgement is separate from attachment acknowledgement; failed attachments remain retryable. Revoke object URLs on removal/unmount.
- [ ] Reuse of public media is an explicit picker action that creates a private copy; it does not convert the public library to private. Preserve external reference links rather than importing linked Canva/Drive files.
- [ ] Add authorised thumbnails, carousel ordering and orphan cleanup restricted to unattached expired uploads. Verify private-bucket policy and failure/retry tests, then commit.

## Task 4 — Clean calendar and post editor
**Files:** `components/admin/mediaCalendar/{CalendarView,PostPanel,CalendarCard,MediaDropzone,InstagramPreview,CategoryManager,calendar.css}`; custom server view; navigation/dashboard registration; UI tests.
**Interfaces:** CalendarView consumes lightweight paginated cards; PostPanel fetches detail only when opened. Share one query cache across month/week/list and filters. Details are accessible by URL post ID and browser Back closes the panel.

- [ ] Test click-to-create, unscheduled drafts, filtering, drag/date-picker equivalence, mobile list mode, unsaved conflict recovery and visible save errors.
- [ ] Register `/admin/media-calendar` within the existing Payload layout and display it only to authorised users. No new standalone login experience.
- [ ] Default Monday-first month view, workspace timezone Australia/Brisbane with an explicit label, Today and adjacent range navigation. Preserve planned wall-clock time on day moves. List is default below 768px; week/month remain user-selectable.
- [ ] Build a focused panel with media, caption, preview, comments and one primary workflow action. Put secondary details under a disclosure. No floating mouse pointers or generic CMS JSON fields.
- [ ] Use navy/white base, restrained category accents, readable status text, existing fonts and neutral selected states. Keyboard-accessible controls, focus trapping/return, Escape close, reduced motion and light/dark styles.
- [ ] Fetch only visible-range cards and lazy thumbnails, prefetch adjacent ranges, use optimistic date feedback with rollback, and lazy-load editor/collaboration modules. Copy caption, individual media downloads and manual Mark posted must never imply API publishing.
- [ ] Validate desktop/mobile visuals and UI tests, then commit.

## Task 5 — Live coediting and rollout verification
**Files:** `features/mediaCalendar/{collaboration,credentialService}.ts`; client collaboration hooks/editor; private Realtime policies/setup guide; two-client integration tests.
**Interfaces:** credential endpoint checks current account and returns five-minute restricted workspace JWT plus publishable connection configuration. Private workspace presence topic and private per-post accepted-update topic. Persist writes through Task 2; server broadcasts committed updates only. Client cursor payloads use Yjs relative positions and bounded presence metadata; identity comes from verified membership, not a client-supplied label.

- [ ] Test simultaneous insert/delete/Unicode edits, selection mapping, duplicate/out-of-order update replay, read-only participants, revoked access and disconnected edits before implementation.
- [ ] Configure an imported asymmetric signing key and private topic RLS in the existing Supabase project. Keep keys server-only and scope credentials to preview/production and permitted capabilities. Use expiry-driven credential/channel renewal; force a fresh account permission check before rejoin. Read-only members may publish limited cursor presence but never durable updates.
- [ ] Bind CodeMirror plain text to Y.Text and relative cursor awareness. Render named selections, stable participant colours and avatars. Batch caption persistence after 500ms idle with two-second maximum; throttle cursor changes to 10/sec. Apply acknowledged remote Yjs updates without resubmitting them.
- [ ] Flush and await all durable updates before requesting review; approval remains server-atomic. Keep account/post-scoped unsent updates locally, clear upon logout, and offer a recoverable copy if remote review locks them out. Distinguish Saving/Saved/Reconnecting/Save failed; Saved only follows server acknowledgement.
- [ ] If collaboration configuration is missing, show a clear setup/unavailable state and preserve local edits; never silently use insecure public channels or pretend live coediting works.
- [ ] Run focused tests, TypeScript, lint, full suite with baseline comparison for unrelated failures, isolated migration checks and hosted build. Test actual private uploads and two real browser accounts, with no lost caption text and peer updates within one second on a healthy connection.
- [ ] Review keyboard/mobile/light/dark layout and measured input feedback (<100ms) and cached range interaction (<1s). Independent code review must cover authentication, asset privacy, race conditions and approval attribution. Fix findings before production readiness claims.
- [ ] Deploy dedicated preview and provide screenshots and the tested link. Enable named test members only after the user identifies them; do not grant broad access or push main as part of this request. Production rollout follows preview review.

## External configuration prerequisite
The repository does not currently contain a collaboration provider integration. Implementation may proceed locally, but live preview requires a private storage bucket and a Supabase Realtime signing-key setup. Prepare exact reversible configuration and validate it in preview; do not claim end-to-end live collaboration is complete until tested. Meta account setup is irrelevant to these prerequisites.
