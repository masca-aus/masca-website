# MASCA CMS revamp verification

Verified on 17 September 2026 against `af07f7a` on the existing preview branch.

## Implementation

- Five-step Events editor uses Payload's existing fields, document view, form submission, media picker and history. Complete events open an overview with section Edit actions.
- A single queued writer autosaves drafts after two seconds, retains edits made during requests, retries failures and serializes publishing. Native autosave is intentionally disabled so it cannot race the custom writer. First creation uses POST; subsequent saves use the resulting document ID.
- Publish sends approved and published in the same request. Draft saves preserve the live document. Unpublish uses Payload's supported metadata operation and works with incomplete saved drafts.
- Public cache invalidation excludes draft saves and includes publishing, unpublishing and deletion.
- Dashboard actions, smaller forms, upload guidance and native previews are refreshed. Thumbnail URLs use the existing public storage URL, including a fallback for older files without a derivative.
- Existing collection field names, database paths, permissions, committee ordering and public poster query remain intact. No migration or public-page redesign is included.

## Checks

- Focused tests cover step validation/navigation, focus movement, private preview separation, draft resumption, save recovery, first-create duplication, edits during a save, publish queued behind autosave, Save and exit, unpublish and public cache invalidation.
- Full suite: 296 passed, 5 pre-existing Careers failures. These remain in `careerBoard.test.tsx`, `careersHealth.test.ts` and `careersSource.test.ts`; Careers code was not changed.
- Typecheck passed. Lint passed with eight existing warnings. Production build passed using Node 22. Diff whitespace check passed.
- Local browser checks used an isolated PostgreSQL database and local S3-compatible storage with disposable records. No write-based checks used the shared preview/production database.
- Browser/API checks confirmed automatic draft creation, resuming persisted data on a fresh page, inline required-field errors, step navigation, section Edit actions, native image selection, attached poster rendering, both themes, and explicit publishing.
- A published event remained publicly unchanged while a different title was autosaved as a draft. Publishing updated the public version; unpublishing made the public API return 404. Internal contact details and notes were absent from anonymous responses.
- The production-built CMS loaded the compact attached-image thumbnail successfully from local storage.

## Matching-condition timing sample

Two warmups and seven alternating measurements per endpoint/server; Node 22, warmed webpack development servers, same disposable database and storage. Full HTTP response bodies were consumed.

| Operation | Before median | After median |
| --- | ---: | ---: |
| Dashboard | 125.18 ms | 120.46 ms |
| Events collection | 118.38 ms | 116.87 ms |
| Open event | 112.67 ms | 110.59 ms |
| Media selection API | 11.47 ms | 10.58 ms |
| Draft save | 19.19 ms | 18.15 ms |

These small differences are within local-run variability; they do not establish a production speed improvement. They exclude browser hydration, rendering and real-world latency. Dashboard queries remain bounded, wizard steps keep fields mounted without fetching each step, and previews reuse compact derivatives.

## Preview review limits

- Responsive CSS is implemented, but the available in-app browser did not apply the requested mobile viewport; a real phone check remains necessary.
- Draft recovery was verified in a fresh browser page against shared persisted records, not on a second physical device.
- Save failures and concurrent requests were exercised with controlled component tests. A full network-disconnection browser test was not performed.
- Upload persistence and generated images were checked in isolated storage; native file-picker interaction was not automated end to end.
- Review the deployed CMS and MNight poster before release. No merge or production release is authorized by this change.
