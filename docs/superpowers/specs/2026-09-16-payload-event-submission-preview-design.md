# Payload Event Submission Preview

## Purpose

Create a preview-only, end-to-end event workflow in which Payload is the single source of truth for submitted events:

```text
Public submitter -> MASCA form -> protected server endpoint -> Payload pending event
-> MASCA review -> approve and publish -> preview Events page
```

The existing Eventbrite-backed Events page on the default branch remains untouched. This work does not remove or modify Jin's Events or Careers implementation.

## Scope

The preview includes:

- `/submit`, a short MASCA submission landing page.
- `/submit/event`, a MASCA-branded public event form.
- A protected server endpoint that accepts submissions.
- A new `events` Payload collection with moderation and version history.
- Poster uploads through the existing Payload Media collection and Supabase Storage adapter.
- A preview Events page that renders only approved, upcoming Payload events.
- Cache revalidation when an event changes.
- CMS review actions through Payload's native edit UI and status fields.

The preview excludes:

- Eventbrite synchronisation, import, or deletion.
- Careers and opportunity submissions.
- A database migration affecting existing collections or rows.
- Replacing production `/events` on `main`.
- New paid third-party services.

## Data model

`events` will be a new Payload collection. Existing Payload collections (`users`, `media`, `committee`, `sponsors`) stay unchanged.

### Public event fields

- `title`
- `organisation`
- `description`
- `startDate`
- `endDate` (optional)
- `venue`
- `state`
- `ticketURL` (optional HTTPS URL)
- `poster` (optional relationship to `media`)
- `reviewStatus`: `pending`, `approved`, or `rejected`
- Payload draft status: draft or published

### Private review and submitter fields

- `contactName`
- `contactEmail`
- `internalNotes`
- `reviewedAt`

Private fields are never selected by the public Events query and have field-level access rules that deny anonymous reads. A future release may add `reviewedBy` once editor roles are introduced.

### Publication invariants

- A browser submission always creates `reviewStatus: pending` and an unpublished draft.
- An approved event is the only event eligible for public rendering.
- A rejected event remains unpublished.
- Public event queries require both `reviewStatus: approved` and `published` status, and exclude events whose end date has passed (or start date has passed when no end date exists).

## Public submission flow

1. A visitor opens `/submit` and selects Event.
2. The visitor completes `/submit/event`.
3. The browser sends the form to a Next.js server endpoint; it never receives a database credential or unrestricted Payload create permission.
4. The endpoint validates all input with a shared server-side schema:
   - field lengths and required values;
   - valid dates and a non-negative event duration;
   - HTTPS ticket URLs when provided;
   - approved Australian state value;
   - confirmation checkbox;
   - poster MIME type and size if a file is attached.
5. The endpoint applies a conservative, in-process abuse limit for the preview and returns a generic success response. Production hardening will replace this with durable distributed rate limiting and a verified Turnstile token before public launch.
6. A valid poster is uploaded through Payload's Local API into the existing Media collection.
7. The endpoint creates a pending, unpublished Event through Payload's Local API.
8. The submitter sees a confirmation that MASCA will review the listing. No internal status, contact information, or implementation details are exposed.

## CMS review flow

The CMS uses Payload's generated Event list and edit views rather than replacing core admin functionality.

- Event list columns show title, organisation, start date, and review status.
- Pending is the default review state for submissions.
- An editor checks public details, poster and submitter information.
- To approve, the editor changes review status to approved and publishes the event.
- To reject, the editor changes review status to rejected and keeps it as a draft.
- Payload versions preserve earlier records for audit and recovery.

The preview uses the existing single authenticated CMS account. Role-specific permissions are deliberately deferred until the workflow is proven and MASCA defines editor responsibilities.

## Preview Events rendering

The feature branch's `/events` route will use Payload as its data source. It will render only events meeting the publication invariants and preserve MASCA's existing visual language.

Eventbrite utilities and environment settings remain in the repository untouched. Since preview deployments are built from this branch, they show the new CMS-backed calendar; the main deployment continues to show Eventbrite data.

Payload event changes call safe cache revalidation for `/events` and the homepage sections that later consume CMS events. The public page uses server-side reads so visitors never receive private event fields.

## Database and storage safety

The new collection creates only additive database structures: Events and its Payload version records. It does not alter committee, users, media, sponsors, Careers, or Eventbrite data.

Schema changes are created as a Payload migration. The migration is reviewed, generated, and tested on the preview branch. It is not run against production during preview deployment. Supabase Storage continues using the configured S3-compatible adapter; poster files receive the same storage treatment as existing CMS media.

## Error handling

- Invalid form entries produce field-specific errors without losing non-sensitive user input.
- A failed poster upload prevents document creation and returns a safe message.
- A failed database write produces a generic retry message and logs diagnostic detail server-side.
- A public Event query failure shows a friendly availability state and does not disclose database or configuration errors.
- An editor cannot publish a pending or rejected event through the public query path.

## Testing and verification

Tests will cover:

- collection schema, public/private access, defaults and versions;
- server validation, invalid dates/URLs/files, and pending-only creation;
- public query filtering for approval, publication and expiry;
- cache-revalidation hook registration;
- public submission success and safe error responses;
- preview Events page rendering only approved CMS events;
- existing Eventbrite utilities and Careers code remaining importable and unchanged.

Before preview deployment, run the focused tests, full test suite, type check, lint, and production build. Existing baseline failures in Jin's Careers tests are tracked separately and must not be misrepresented as caused by this branch.

## Rollout and rollback

1. Deploy this branch as a Vercel preview only.
2. Exercise a real pending submission, review it in CMS, approve it, and confirm it appears on preview `/events`.
3. Confirm private contact fields are absent from public output.
4. Test rejection, expired events and poster upload failure.
5. Review the preview with MASCA before any merge.

Rollback is straightforward: delete the preview deployment or close the branch. Main retains Eventbrite as the live Events source. No existing database data is changed or removed.
