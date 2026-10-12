# MASCA collaborative media calendar

## Goal
A private, fast National media workspace inside the existing CMS. Members create, prepare, discuss and approve Instagram content together. The main experience is calendar → post panel → review. Keep MASCA branding and the existing CMS account system. Instagram connection, analytics and automatic publishing are deferred.

## Experience
- Default month calendar; week and list alternatives, Today and previous/next controls. Monday starts the week. Display the workspace timezone explicitly; initial timezone Australia/Brisbane. Keep undated ideas in an Unscheduled tray.
- Click a day to create a draft. Drag a card to change its planned publishing date; provide the same action through a date picker for keyboard and mobile users. Distinguish planned dates from actual Instagram scheduling.
- Open posts in a focused panel: editable title, media area, caption, Instagram preview and comments. On phones use a full-screen editor and list-first calendar view. Do not place a large generic CMS form in the main flow.
- Paste clipboard images, drop image/video files or select files directly. Multiple files form an ordered attachment list. Show local thumbnails immediately, progress and individual retries. Preserve drafts during failed uploads. Optional existing-media picker and reference links to Canva, Drive or Miro.
- Additional details collapse by default: owner, collaborators, preparation deadline, checklist, reference links and on-hold reason. A preparation deadline does not replace the publishing date.
- Customisable main category determines card accent colour; display its text label too. All media members may create, rename, recolour and archive categories. Archive preserves existing assignments. Seed MASA, Careers, Community, Welfare and Announcements; colours are editable.
- Plain captions with line breaks, hashtags and tags; Google Docs-style simultaneous typing, named text cursors and selections. No floating mouse pointers. Room avatars show connected members; post avatars identify viewers. Presence disappears after disconnect and does not become a last-seen tracker.
- In-app mentions and review notifications with an unread indicator. No external notification email until separately configured. Comments can be resolved. Store discussion separately from caption editing.

## Approval and publishing
Draft → In review → Approved → Posted; Changes requested returns to editable work. On hold is a separate flag with a reason, preserving the workflow state.
Media members and designated chairs may approve. Approval requires a different person: creator and contributors to the caption/media revision are excluded. Contributors are tracked by authenticated server writes, not presence. One eligible approval is sufficient. Record approver, timestamp and approved revision.
Caption or media changes invalidate approval atomically; date changes preserve content approval but appear in history. Freeze content editing while In review; Request changes or Withdraw review reopens editing. Review submission requires successful persistence of all caption updates and completed media uploads. Comments remain available during review.
Posted is manual: provide Copy caption, Download media and an optional published Instagram URL. Posted content is immutable; Duplicate creates a new draft. Do not imply that the calendar published anything.

## Integration and data
- Add a custom /admin/media-calendar view and navigation entry, rendered within the existing Payload admin layout. Separate calendar access from the existing public-media permissions.
- Add explicit user permissions for calendar view/edit/approve plus team designation for media member or chair. Administrators manage access, but do not gain permission to self-approve. No automatic grants to all existing editors; enable named National users during preview setup.
- Payload/Postgres stores posts, categories, comments, revision snapshots and notifications. Private assets use a separate bucket/collection: authenticated uploads, authorised short-lived downloads, no public URLs for unpublished drafts. Do not alter public website assets.
- Use Yjs shared text for captions with a dedicated collaboration adapter. Use Supabase private Realtime channels for authorised presence and server-accepted update notifications; durable caption updates go through authenticated CMS endpoints. Postgres serialises Yjs update merges per post and returns acknowledged revisions. Do not broadcast unpersisted updates as Saved.
- Bridge the existing CMS session to short-lived Realtime credentials using an imported signing key, restricted workspace claims and private channel policies. The signing key remains server-only. Recheck permissions on durable writes and credential renewal; bound credentials to five minutes. Read-only participants cannot send editing updates. Preview channels and storage remain isolated from production.
- Use conditional revision writes for dates, attachments and other fields. Conflicting updates preserve local input and offer reload/reapply; never overwrite a remote change silently.
- Keep unsent caption updates locally scoped to account/post. Reconnect merges pending edits only while the post remains editable; if review locked the post, retain a recoverable local copy rather than mutating the approved revision.
- Caption history checkpoints on review requests and at bounded intervals; no database row per keystroke. Throttle cursor traffic separately from caption saves. Persist batched updates after 500ms idle, with a two-second maximum while typing.

## Speed and usability acceptance
- Load only the visible calendar range and lightweight card data; fetch post detail and collaboration modules on opening a post. Prefetch adjacent date ranges. Lazy-load thumbnails; never fetch full video binaries for calendar cards.
- Typing, date dragging and local upload previews respond immediately without waiting for network. Display Saving, Saved, Reconnecting or Save failed accurately. No full-page refresh for ordinary edits.
- Target input feedback within 100ms, peer caption updates within one second on a healthy connection, and an interactive cached calendar within one second. Measure actual results in preview rather than promise unconditional timings.
- Accessible buttons, keyboard rescheduling, visible focus, labelled controls, text alongside status colours and reduced-motion behaviour. Keep navy/white branding with restrained coloured accents and existing CMS light/dark themes.

## Validation and rollout
Test permission boundaries, anonymous denial, private asset access, non-contributor approval, concurrent revision changes, approval invalidation, dropped connections and merge recovery. Test two browsers typing concurrently without lost characters, cursor movement, upload failure/retry, carousel ordering, timezone/day movement and keyboard/mobile flows.
Ship in an isolated preview with migrations and a small named team. Review desktop/mobile visual layout and two-user collaboration before enabling production. Existing calendar/action-log Sheets remain untouched; no automatic import or Google Drive sync. Realtime credentials and private storage configuration must be verified before live collaboration is advertised. No public fallback channels.
