# CMS collection UX refresh

## Goal

Make the Payload CMS comfortable for non-technical MASCA committee editors. An editor should be able to understand what a collection contains, find work requiring attention, make a safe update, and return to their list without needing to understand Payload internals.

## Scope

The refresh applies to the five existing CMS collections: Events, Committee, Media, Sponsors, and Users. It changes admin presentation only. It does not alter database tables, field names, public-site data contracts, authentication, access rules, event-publication rules, or existing records.

## Collection-list experience

Each collection list will have a reusable, plain-language collection header containing:

- a concise purpose statement;
- one primary creation action appropriate to the collection;
- optional task-oriented guidance for the most important workflow;
- an accessible visual status legend where a collection has statuses.

Events will retain status colour badges with text labels: green for approved, amber for pending review, and red for rejected. Other collections will use concise list guidance rather than invented workflow states.

Existing Payload search, filters, columns, pagination, bulk actions, and advanced preferences remain available. They are not removed, but the primary path does not rely on them.

## Edit-screen experience

Every collection document screen will have consistent, labelled sections:

1. **Public details**: content seen on masca.org.au.
2. **Images and links**: visual assets and destinations where relevant.
3. **Internal details**: private notes, contact details, or administration-only fields.
4. **Review and publish**: the final decision or save step, only where the workflow warrants it.

Payload groups will provide the visual hierarchy and preserve all current fields and values. Relevant descriptions will explain the outcome of the section in plain language. Empty or optional sections will not be added merely for uniformity.

## Event moderation

The event review-status field remains the final content field and is visually emphasised. It continues to use `pending`, `approved`, and `rejected` values. Public visibility still requires both `reviewStatus = approved` and Payload publication status `_status = published`; this policy is not changed.

The review section will state this distinction plainly, so editors understand that approving an event does not itself publish it.

## Reusable implementation pieces

- Collection intro/header component, configured with collection-specific copy and primary action.
- Reusable section group styling for Payload field groups.
- Existing `EventReviewStatusCell` for event list badges, extended only if other genuine statuses need similar treatment.
- Shared CSS tokens for light and dark modes, reduced-motion safe and keyboard-accessible.

## Navigation and safety

Document screens will include an obvious return-to-list action in addition to Payload breadcrumbs. It must preserve unsaved-change protection: it navigates normally and does not suppress Payload's leave-without-saving warning.

Change history remains secondary but available. API views stay hidden where already configured. No database migrations are required.

## Error handling and accessibility

- All status colour has an accompanying written label.
- Section labels are semantic headings and descriptions remain readable in both themes.
- Buttons have accessible names and visible keyboard focus.
- No critical action relies solely on hover, animation, colour, or iconography.
- Payload's existing validation and error messages remain the source of truth for saves.

## Verification

- Configuration tests assert that every collection receives its intended labels, groups, and user-facing guidance.
- Component tests cover section/header content and event status labels.
- Existing event access tests continue to prove that only approved, published events are public.
- Typecheck, lint, focused CMS tests, then preview verification in the protected Vercel deployment.

## Non-goals

- Replacing Payload with a separate CRM.
- Changing roles/permissions or the users collection's authentication flow.
- Altering the public website layouts.
- Changing or migrating any Supabase data.
