# Payload Event Submission Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel preview where public event submissions enter Payload as private pending drafts and only approved, published, upcoming events appear on MASCA's public event surfaces.

**Architecture:** Keep Payload and Supabase as the server-owned content platform. A MASCA form posts multipart data to a guarded Next.js route, a service validates and creates Media/Event documents through Payload's Local API, and public server components query a deliberately narrow approved-event projection. Existing Eventbrite and Careers files remain in place so `main` and rollback retain Jin's current behaviour.

**Tech Stack:** Next.js 16 App Router, React 19, Payload 3.86, PostgreSQL on Supabase, Supabase S3-compatible Storage, Zod 4, Vitest 4, Vercel previews.

**Spec:** `docs/superpowers/specs/2026-09-16-payload-event-submission-preview-design.md`

## Global Constraints

- Branch: `codex/payload-submission-workflow`, based on `origin/main` commit `31c7462`.
- Do not delete or rewrite Jin's Eventbrite or Careers implementation.
- Payload is the only source rendered by event surfaces on this preview branch.
- Anonymous browsers never receive database, Payload, S3, or privileged Supabase credentials.
- Anonymous submissions always create `reviewStatus: "pending"` and `_status: "draft"` regardless of submitted fields.
- Public reads require `reviewStatus: "approved"` and `_status: "published"` and exclude past events.
- Submitter contact details and internal notes are omitted from anonymous reads.
- Database changes are additive. Abort migration review if SQL deletes data or alters an existing application table; Payload's migration-history entry is expected.
- Enable RLS on new tables in the exposed `public` schema, create no anonymous Data API policies, and revoke direct `anon` and `authenticated` table privileges; Payload's server-side database role remains the only application path.
- Do not apply the database migration until its SQL has been reviewed and the user has approved the deployment step.
- Keep uploads at or below the existing 5 MB limit and accept JPEG, PNG, or WebP only for public event posters.
- Preview abuse protection is intentionally local and conservative; durable distributed rate limiting and Turnstile are launch gates, not preview dependencies.
- The repository baseline has 5 pre-existing Careers test failures; report them separately and never attribute them to this branch.

---

### Task 1: Define the event contract and validation

**Files:**
- Create: `features/events/eventSubmission.ts`
- Test: `tests/eventSubmission.test.ts`

**Interfaces:**
- Produces: `EVENT_STATES`, `EventSubmissionInput`, `EventSubmissionResult`, `parseEventSubmission(formData: FormData)`.
- Produces: `isAllowedPoster(file: File): boolean` with the shared 5 MB and MIME constraints.
- Consumes: Zod 4 only; no Payload or database dependency.

- [ ] **Step 1: Write failing validation tests**

Cover valid data, missing confirmation, non-HTTPS ticket URL, end before start, invalid state, a file over 5 MB, and a non-image file. Assert structured field errors rather than Zod internals:

```ts
const result = parseEventSubmission(validFormData({ ticketURL: "http://example.org" }));
expect(result).toEqual({ ok: false, fieldErrors: { ticketURL: ["Use a secure https:// link."] } });
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/eventSubmission.test.ts`

Expected: FAIL because `features/events/eventSubmission` does not exist.

- [ ] **Step 3: Implement the minimal typed parser**

Use exact bounds: title 3-160, organisation 2-160, description 20-5000, venue 2-240, contact name 2-120, contact email 254, ticket URL optional HTTPS, poster optional 5 MB JPEG/PNG/WebP. Convert local datetime strings to ISO only after verifying `endDate >= startDate`.

```ts
export type EventSubmissionResult =
  | { ok: true; data: EventSubmissionInput; poster?: File }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseEventSubmission(formData: FormData): EventSubmissionResult;
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- tests/eventSubmission.test.ts`

Expected: all Event submission validation tests pass.

- [ ] **Step 5: Commit the contract**

```bash
git add features/events/eventSubmission.ts tests/eventSubmission.test.ts
git commit -m "feat: validate public event submissions"
```

### Task 2: Add the isolated Payload Events collection

**Files:**
- Create: `collections/Events.ts`
- Modify: `payload.config.ts`
- Modify: `tests/payload.config.test.ts`
- Test: `tests/eventsCollection.test.ts`

**Interfaces:**
- Produces: `Events: CollectionConfig` with slug `events`.
- Produces: `isPublicEventRead({ req }): true | Where` and private-field access functions.
- Consumes: event states from Task 1 and existing `safeRevalidatePath` behaviour in `payload.config.ts`.

- [ ] **Step 1: Write failing collection tests**

Assert registration, default columns, draft/version settings, `maxPerDoc: 25`, `lockDocuments: false`, default `pending`, authenticated full reads, anonymous approved/published constraint, private field denial, image relationship, and event-page revalidation hooks.

```ts
expect(events.versions).toMatchObject({ drafts: true, maxPerDoc: 25 });
expect(contactEmail.access?.read?.({ req: { user: null } } as never)).toBe(false);
expect(contactEmail.access?.read?.({ req: { user: { id: 1 } } } as never)).toBe(true);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- tests/eventsCollection.test.ts tests/payload.config.test.ts`

Expected: FAIL because the Events collection is absent.

- [ ] **Step 3: Implement and register the collection**

Set collection access so unauthenticated REST reads receive only approved, published documents while create/update/delete remain authenticated. Use field access to hide `contactName`, `contactEmail`, `internalNotes`, and `reviewedAt` anonymously. Configure drafts without autosave and cap version history at 25.

```ts
access: {
  read: ({ req }) => req.user ? true : {
    and: [
      { reviewStatus: { equals: "approved" } },
      { _status: { equals: "published" } },
    ],
  },
  create: ({ req }) => Boolean(req.user),
  update: ({ req }) => Boolean(req.user),
  delete: ({ req }) => Boolean(req.user),
},
versions: { drafts: true, maxPerDoc: 25 },
lockDocuments: false,
```

Add `afterChange` and `afterDelete` hooks for `/events` and `/` using the existing safe revalidation helper.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm test -- tests/eventsCollection.test.ts tests/payload.config.test.ts`

Expected: collection tests pass; existing config assertions are updated from four to five MASCA collections.

- [ ] **Step 5: Commit the collection**

```bash
git add collections/Events.ts payload.config.ts tests/eventsCollection.test.ts tests/payload.config.test.ts
git commit -m "feat: add moderated events collection"
```

### Task 3: Create the server-owned submission service and route

**Files:**
- Create: `features/events/createEventSubmission.ts`
- Create: `features/events/submissionRateLimit.ts`
- Create: `app/(frontend)/api/submit-event/route.ts`
- Test: `tests/createEventSubmission.test.ts`
- Test: `tests/submitEventRoute.test.ts`

**Interfaces:**
- Consumes: `parseEventSubmission(formData)` from Task 1.
- Produces: `createEventSubmission({ payload, data, poster }): Promise<{ id: number | string }>`.
- Produces: `POST(request: NextRequest): Promise<NextResponse>`.
- Produces: `consumeSubmissionAttempt(key: string, now?: number): boolean`, limited to 5 attempts per rolling hour per process for preview.

- [ ] **Step 1: Write failing service tests**

Use a narrow fake Payload object and verify that poster creation happens first, Media alt text is derived from the event title, and the Event write overrides all status input:

```ts
expect(payload.create).toHaveBeenLastCalledWith(expect.objectContaining({
  collection: "events",
  draft: true,
  data: expect.objectContaining({ reviewStatus: "pending", _status: "draft" }),
}));
```

Also verify no Event document is created when Media upload fails.

- [ ] **Step 2: Run the service test and confirm RED**

Run: `npm test -- tests/createEventSubmission.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the minimal creation service**

Accept only already-validated data. Pass `overrideAccess: true` only inside this server-only service, never from browser input. When a poster exists, call Media creation with the validated file and `alt: data.title`; then create the draft Event with the returned Media ID.

- [ ] **Step 4: Run the service test and confirm GREEN**

Run: `npm test -- tests/createEventSubmission.test.ts`

Expected: all service tests pass.

- [ ] **Step 5: Write failing route tests**

Cover malformed multipart data (400), validation errors (422), sixth attempt (429), safe server error (503), and successful pending submission (201). Verify responses never include stack traces, database messages, contact values, or credentials.

- [ ] **Step 6: Run route tests and confirm RED**

Run: `npm test -- tests/submitEventRoute.test.ts`

Expected: FAIL because the route and limiter do not exist.

- [ ] **Step 7: Implement the route and preview limiter**

Derive the preview rate-limit key from Vercel's forwarded IP header with a bounded fallback; never store the IP in Payload. Parse `request.formData()`, validate, load Payload with `getPayload({ config })`, call the service, and return only stable JSON shapes:

```ts
type SubmitEventResponse =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
```

- [ ] **Step 8: Run route and service tests and confirm GREEN**

Run: `npm test -- tests/createEventSubmission.test.ts tests/submitEventRoute.test.ts`

Expected: all submission backend tests pass.

- [ ] **Step 9: Commit the submission backend**

```bash
git add features/events/createEventSubmission.ts features/events/submissionRateLimit.ts 'app/(frontend)/api/submit-event/route.ts' tests/createEventSubmission.test.ts tests/submitEventRoute.test.ts
git commit -m "feat: accept protected event submissions"
```

### Task 4: Build the MASCA public submission experience

**Files:**
- Create: `app/(frontend)/submit/page.tsx`
- Create: `app/(frontend)/submit/event/page.tsx`
- Create: `app/(frontend)/submit/event/EventSubmissionForm.tsx`
- Test: `tests/eventSubmissionPages.test.tsx`

**Interfaces:**
- Consumes: `POST /api/submit-event` and its stable response union from Task 3.
- Produces: accessible `/submit` and `/submit/event` routes.

- [ ] **Step 1: Write failing static-render tests**

Assert page headings, Event option, labelled inputs, file constraints, accuracy confirmation, privacy explanation, submit state, success message region, error summary, and links back to Events. Assert no Careers form is advertised as available yet.

- [ ] **Step 2: Run page tests and confirm RED**

Run: `npm test -- tests/eventSubmissionPages.test.tsx`

Expected: FAIL because the pages do not exist.

- [ ] **Step 3: Implement the submission landing page and form**

Follow existing MASCA container, hero, input, button and focus styles. Use progressive client enhancement: submit `FormData`, disable only the submit button while pending, focus the error summary on failure, preserve entered text, clear the form on success, and respect reduced motion. Copy must state that submission does not guarantee publication and contact details are used only for review.

- [ ] **Step 4: Run page tests and confirm GREEN**

Run: `npm test -- tests/eventSubmissionPages.test.tsx`

Expected: all submission UI tests pass.

- [ ] **Step 5: Commit the public form**

```bash
git add 'app/(frontend)/submit' tests/eventSubmissionPages.test.tsx
git commit -m "feat: add MASCA event submission form"
```

### Task 5: Make Payload the preview event source

**Files:**
- Create: `features/events/publicEvents.ts`
- Modify: `app/(frontend)/events/page.tsx`
- Modify: `app/(frontend)/sections/upcomingEvent.tsx`
- Modify: `app/(frontend)/sections/eventShowcase.tsx`
- Test: `tests/publicEvents.test.ts`
- Test: `tests/eventsPage.test.tsx`

**Interfaces:**
- Produces: `getApprovedUpcomingEvents(now?: Date): Promise<Event[]>`, mapped into Jin's existing Eventbrite-compatible display contract from `utils/events.ts`.
- Consumes: Payload Local API and the `events` collection from Task 2.

- [ ] **Step 1: Write failing public-query tests**

Verify the Payload query requests approved, published events sorted by start date; verify the returned object omits contact and internal fields even if a fake Payload response contains them. Test expiry rules for an event with and without `endDate`.

```ts
expect(Object.keys(result[0])).not.toContain("contactEmail");
expect(findArgs.where).toMatchObject({ reviewStatus: { equals: "approved" } });
```

- [ ] **Step 2: Run query tests and confirm RED**

Run: `npm test -- tests/publicEvents.test.ts`

Expected: FAIL because the public source does not exist.

- [ ] **Step 3: Implement the safe public projection**

Query with `draft: false`, `overrideAccess: false`, `sort: "startDate"`, and a field projection that excludes every private field. Map Payload dates, poster URL and state into Jin's existing `Event` display contract in one server-only file.

- [ ] **Step 4: Run query tests and confirm GREEN**

Run: `npm test -- tests/publicEvents.test.ts`

Expected: all query and privacy tests pass.

- [ ] **Step 5: Write failing event-surface tests**

Use the existing `Event` fixture shape and assert the Events page, homepage upcoming card and showcase render approved CMS events, use `/submit/event` for the hosting CTA, and render a friendly empty/error state.

- [ ] **Step 6: Run surface tests and confirm RED**

Run: `npm test -- tests/eventsPage.test.tsx tests/publicEvents.test.ts`

Expected: FAIL while event surfaces still import the Eventbrite source.

- [ ] **Step 7: Adapt existing event components without deleting Eventbrite**

Replace only the source imports on public surfaces with `getApprovedUpcomingEvents`. Map Payload records into Jin's existing `Event` display contract so `EventCard`, `EventSection`, and `EventShowcaseGrid` remain unchanged. Keep `utils/events.ts`, Eventbrite environment variables, and their tests unchanged for rollback. All preview event surfaces must now consume Payload.

- [ ] **Step 8: Run event tests and confirm GREEN**

Run: `npm test -- tests/publicEvents.test.ts tests/eventsPage.test.tsx`

Expected: all new event-source and rendering tests pass.

- [ ] **Step 9: Commit the preview source switch**

```bash
git add features/events/publicEvents.ts 'app/(frontend)/events/page.tsx' 'app/(frontend)/sections/upcomingEvent.tsx' 'app/(frontend)/sections/eventShowcase.tsx' tests/publicEvents.test.ts tests/eventsPage.test.tsx
git commit -m "feat: render approved Payload events"
```

### Task 6: Generate and audit the additive Payload migration

**Files:**
- Create: `migrations/20260916_010000_add_events_submission_workflow.ts`
- Create: `migrations/20260916_010000_add_events_submission_workflow.json`
- Modify: `migrations/index.ts`
- Modify: `payload-types.ts`
- Modify: `app/(payload)/admin/importMap.js`
- Test: `tests/eventMigration.test.ts`

**Interfaces:**
- Consumes: final Payload collection shape from Task 2.
- Produces: reversible `up`/`down` migration for only Events structures plus expected Payload migration bookkeeping.

- [ ] **Step 1: Install locked dependencies using a supported Node runtime**

Use Node `22.13+` or Node `24+`, then run `npm ci`. Do not update package versions or rewrite `package-lock.json`.

- [ ] **Step 2: Regenerate Payload types and import map**

Run: `npm run generate:types && npm run generate:importmap`

Expected: generated types include `Event`; admin import map remains valid.

- [ ] **Step 3: Generate the migration using Payload's documented command help**

Run: `npm run payload -- migrate:create --help`, then use the supported command to create `add_events_submission_workflow`. Do not use database push.

Rename the generated TypeScript migration and schema snapshot to `20260916_010000_add_events_submission_workflow`, update their imports in `migrations/index.ts`, and preserve Payload's generated contents.

- [ ] **Step 4: Audit the generated SQL before any application**

Read the entire `up` and `down` migration. The `up` migration may create Events tables, version tables, enums, indexes, and event-owned foreign keys. Add explicit `ENABLE ROW LEVEL SECURITY` and `REVOKE ALL ... FROM anon, authenticated` statements for each new public-schema table; add matching safe reversal statements in `down`. It must not drop, truncate, rename, or rewrite existing application tables. If Payload adds a relation to an internal lock table, remove the need by retaining `lockDocuments: false` and regenerate. Stop for user review if any existing application table is altered.

- [ ] **Step 5: Write and run a migration-scope test**

The test reads the migration source and rejects destructive SQL tokens and forbidden existing table targets (`users`, `media`, `committee`, `sponsors`), while allowing the Event poster foreign key to reference Media without altering Media. Assert that every new public-schema table enables RLS and revokes direct access from `anon` and `authenticated`.

Run: `npm test -- tests/eventMigration.test.ts`

Expected: migration scope test passes.

- [ ] **Step 6: Commit generated artifacts**

```bash
git add migrations payload-types.ts 'app/(payload)/admin/importMap.js' tests/eventMigration.test.ts
git commit -m "feat: add isolated events database migration"
```

### Task 7: Verify locally and prepare the Vercel preview

**Files:**
- Modify: `README.md`
- Test: all new and existing tests.

**Interfaces:**
- Produces: operator documentation for migration, preview submission, review, approval, rejection, and rollback.

- [ ] **Step 1: Document the preview workflow and launch gates**

Add a README section with exact URLs (`/submit`, `/submit/event`, `/admin/collections/events`, `/events`), approval steps, the migration command used by deployment, and the production launch gates: durable distributed rate limit, Turnstile verification, notification delivery, and stakeholder approval.

- [ ] **Step 2: Run focused verification**

Run:

```bash
npm test -- tests/eventSubmission.test.ts tests/eventsCollection.test.ts tests/createEventSubmission.test.ts tests/submitEventRoute.test.ts tests/eventSubmissionPages.test.tsx tests/publicEvents.test.ts tests/eventsPage.test.tsx tests/eventMigration.test.ts
```

Expected: all new Event workflow tests pass.

- [ ] **Step 3: Run repository verification**

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`. Record the 5 known Careers baseline failures separately; no new or changed test may fail.

- [ ] **Step 4: Inspect the final change boundary**

Run `git diff --stat origin/main...HEAD`, `git diff --check origin/main...HEAD`, and inspect the full diff. Confirm `utils/events.ts` and all Careers implementation files have not been deleted.

- [ ] **Step 5: Commit operator documentation**

```bash
git add README.md
git commit -m "docs: explain event submission preview workflow"
```

- [ ] **Step 6: Request database migration approval**

Present the audited migration diff and exact affected table list to the user. Do not run the migration or deploy before approval.

- [ ] **Step 7: Apply migration and verify through Payload**

After approval, run the project's migration command once. Verify with a read-only Payload query that the Events collection responds and that the existing collections still respond. Do not grant Supabase `anon` or `authenticated` Data API access; browser access is mediated by Next.js/Payload.

- [ ] **Step 8: Push and deploy the preview**

Push `codex/payload-submission-workflow`, let Vercel create a branch preview, and verify `/submit/event`, `/admin/collections/events`, and `/events` on the preview URL.

- [ ] **Step 9: Exercise the end-to-end acceptance path**

Submit one event, verify it is absent from public pages while pending, approve and publish it in CMS, verify it appears on preview event surfaces, then reject or unpublish it and verify it disappears. Confirm public responses and page source contain no contact or internal fields.

- [ ] **Step 10: Report preview and known baseline state**

Provide the preview URL, branch, commits, affected database structures, verification results, known Careers baseline failures, launch gates, and rollback procedure. Do not merge to `main` without a separate explicit request.
