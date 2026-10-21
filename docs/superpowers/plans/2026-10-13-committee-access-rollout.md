# Committee access rollout

The feature is implemented behind the server setting `COMMITTEE_ACCESS_ENABLED`. Leave it unset until National has reviewed existing access and entered actual committee term dates. Switching it on changes content authority: platform administration alone no longer grants content access.

## Prepare

1. Deploy the additive migration with the flag off. Existing National workflows remain active.
2. Run `node --experimental-strip-types scripts/review-committee-access.mts` against the intended environment. The read-only report proposes explicit legacy grants with **unset** term dates and flags broad administrator/all-content/viewing access for review.
3. In **People & access**, platform administrators assign explicit committee/area presets and actual term end dates. Appoint committee access managers separately. Saving the membership editor records the review and an audit entry; stale edits must be reloaded.
4. Confirm that an administrator retains platform recovery access. Managers cannot appoint other managers, extend members beyond their own term, or alter another committee's grants.
5. Private library uploads use the existing private calendar bucket, separate in preview and production. Existing public library images remain public; newly uploaded committee files are private and immutable. Images attached to a published parent can be publicly rendered without exposing the private library. Review legacy public images before treating them as confidential.
6. Configure `CRON_SECRET` for the daily protected handover job. The job emits in-app reminders at 30 and 7 days, deduplicated per recipient/person/membership/term. No reminder emails are sent.

## Activate and verify

Run `node --experimental-strip-types scripts/review-committee-access.mts --check`. All active/invited accounts must have reviewed, valid membership data; the protected reminder job must be configured. The build refuses activation when this check fails. Then enable `COMMITTEE_ACCESS_ENABLED=true` and deploy the checked version.

The production build runs `scripts/activate-committee-drafts.mts` after the readiness check, including when the additive migration was installed on an earlier deployment. This seeds sponsor/directory versions from current live rows only when no latest version exists. Existing private drafts are preserved. Editors save private drafts; independent Approvers publish the reviewed revision. Published media metadata and bytes are immutable; upload a replacement image and review the containing listing. Referenced images are retained for listing history.

Check an actual National editor, state editor, state access manager and independent approver. Verify scoped drafts/history/files/search/counts, record sharing and revocation, independent approval, public publication/poster rendering, and membership renewal/removal. Calendar posting remains manual. Previously minted calendar storage links retain their short existing validity (GET 60 seconds; staging PUT 300 seconds); subsequent signing/completion requests recheck current access.

Rollback by disabling the flag, retaining memberships, approvals and audit history. Do not drop new data or revert the additive migration.

## Local rehearsals

`tests/mediaCalendar/committeeDatabase.test.ts` runs only with a localhost `masca_calendar_committee_qa` URL. It resets disposable calendar records and checks real SQL isolation, sharing/expiry, presence, category ownership, mentions and revoked uploads.

`scripts/check-committee-access.mjs` runs only against localhost `committee_access_qa_20261013`; it checks additive migration idempotence, bounded delegated writes, concurrent membership changes, audit and reminder deduplication.

`scripts/check-committee-cms.mts` runs only against localhost `committee_access_payload_qa_20261013`; it checks actual Payload draft/history boundaries, immediate sharing/revocation, event/sponsor/directory independent publication, preservation of live versions, private attachment population, referenced-file deletion protection and atomic platform membership auditing/stale-edit rejection. These fixtures never authenticate or send mail as real MASCA users.
