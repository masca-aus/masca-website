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

## Photo submission follow-up

Reproduced a media drawer save stuck on “Submitting…” inside an event. Database inspection showed the only query client idle inside the media transaction: Payload's separate document-lock lookup could not obtain another client because the two-client pool also held its reconnect listener. Increasing the bounded pool to five clients resolved the same browser save without disabling locking; a ten-second connection-acquisition timeout prevents indefinite pool waits.

Verified the drawer displayed “Updated successfully” and refreshed the attached image. A new image upload returned 201 in 59 ms, a subsequent media update returned 200 in 39 ms, and both image and thumbnail returned 200 using isolated local storage. Connection/configuration and save-controller tests: 27 passed. No production media was changed.

## Events list actions and wizard polish

The Review Status and Status cells are now keyboard-accessible dropdowns that save on selection. Both controls disable during a row's request. Approving saves a draft; publishing approves and validates the latest saved record inside the write; Pending and Rejected explicitly unpublish. Errors retain the old status and link to the editor. The list refreshes its current route, preserving filters and pagination and reflecting both saved statuses.

Browser/API checks on isolated records verified approval stays private, publishing exposes the event without internal contact details, incomplete publishing returns a field error, rejection removes the public event, and anonymous actions return 401. Rejecting and republishing updates both columns correctly. The focused action/editor/publication tests pass (37 tests).

The wizard uses a progress bar, completed-step checkmarks, descriptive step labels and 180 ms entrance animations. Fields remain mounted; entered values survive navigation. Reduced-motion CSS disables the transitions and animations. Light and dark themes were inspected at a narrow 536 px viewport without page overflow; this is not a physical-phone verification.

## Compact wizard and date-range picker

The step cards have been replaced by a compact progress line and an expandable step list. Save feedback now sits beside Save and exit. The document heading shares the form width; repeated description/metadata and outer wizard boxes have been removed.

The calendar overlap was traced to the wizard animation retaining a transform after completion. Animation fill now applies only before the transition, leaving no persistent field stacking contexts. Events use an inline, on-demand calendar with One day and Date range modes, optional same-day end time, separate time controls, and one or two visible months according to available width. The startDate/endDate database fields and device-timezone-to-ISO convention remain unchanged. Existing dates keep their clock times when moved; nonexistent daylight-saving times are rejected. A registered validation check blocks progression/publishing for an unfinished range. The calendar container ref restores arrow-key focus navigation in the bundled calendar version.

Verified the optimized local build against isolated storage/database: calendar loads on demand; its static layout ends above the Venue field; no horizontal overflow at the inspected narrow/wide layouts; both themes, range and single-day modes, optional end time, keyboard controls, save feedback and reload were checked. The public test event retained its original 1 December date while the saved draft held 16 December; anonymous output contained no internal contact details. No production content was changed.

47 focused tests passed, typecheck passed, lint completed with the eight existing warnings, and the production build passed. The full suite with two workers has 325 passing tests and the five known Careers failures. Default concurrency additionally hit the existing REST-route import test's five-second timeout; that test passed with reduced concurrency. No timeout threshold or Careers code was changed.

## Final-step cleanup and preview efficiency

Step five now shows one compact public preview with a bounded poster, event details and section edit links, followed by a separate committee-only contact section. Internal notes expand on demand. Review status uses the standard field styling without the accent box or redundant clear action. Back to Events and the native More actions menu share 44 px height, borders, corners and focus styling; native menu actions remain available.

View steps uses a 220 ms height/opacity disclosure with reduced-motion support, Escape-to-close and hidden-step focus exclusion. Browser checks inspected light/dark themes, loaded poster, closed disclosure, matching toolbar dimensions and absence of horizontal overflow at the available viewport.

Poster metadata is fetched only for the final step, reused for two minutes within the editor, and refreshed after visiting Poster and links. Aborted responses cannot overwrite a newer selection. The matching local media response decreased from 603 to 347 bytes while retaining generated image and thumbnail URLs. This is a payload/request reduction, not a measured production page-load speedup. The header no longer subscribes to every form value; closed step navigation skips completion validation.

Two added tests verify metadata reuse/refresh and stale-response protection. 42 focused tests passed, typecheck passed, lint passed with eight existing warnings, and the production build passed against isolated services. The full suite with two workers recorded 327 passing tests and the same five known Careers failures; Careers code remains unchanged. No production content was written.

## Shared hierarchy and dashboard design

The event preview gives the event title stronger typographic emphasis and separates the committee-only contact and review fields with a Before publishing heading. Save and exit and Back now use neutral outlined buttons. Actions use 8 px rounded rectangles across the dashboard, wizard, native Payload buttons, theme toggle and calendar navigation; status pills remain distinct. Dark-theme primary buttons have a brighter fill and border.

The dashboard replaces the banner and card grid with a compact heading, one Create event action, three count shortcuts, a bounded submission list and simple content-management rows. Existing create/manage/filter links and empty states remain available. Obsolete decorative markup and roughly 400 lines of superseded dashboard CSS were removed. It remains a server component with the same bounded queries and no additional requests or client dependencies; no new timing improvement is claimed.

Local browser inspection used isolated services and verified both screens in light and dark themes, loaded event poster and accessible link/button names. Fifteen focused dashboard/editor tests passed, typecheck passed, lint passed with eight existing warnings, and the production build passed. Responsive layouts are implemented; physical-phone verification remains outstanding.

The full suite with two workers remains at 327 passing tests and the five known Careers failures. No Careers or publication logic was changed.

## Standard return navigation and committee wizard

All five collection lists now provide Back to dashboard; document screens retain Back to their collection, and Account also has a dashboard return link. Links share styling and content gutters. Return links are suppressed inside dialogs so the native Close control remains the way back from media selection/editing.

Committee creation now uses Identity, Role and term, Portrait and profile, and Review and save steps. It shares the event progress bar, expanding step navigation, entrance animation, focus treatment, button placement and responsive styles. Existing records open the review with section Edit actions and a compact portrait. Payload fields stay mounted, database paths and ordering are unchanged, and saving remains explicit through Payload's native SaveButton and form handling. Required fields and term/profile formats are checked before advancing; server field errors return to their relevant step. The manual admin import map includes the new components.

Browser checks against isolated local services verified required-field blocking, all four steps, native media selection, successful creation and reopening of a disposable committee record, portrait rendering, light/dark themes, committee ordering controls, and Events/Committee return links. The optimized production build displayed Payload's Leave without saving warning when Cancel was selected after editing; the temporary unsaved edit was discarded. No production content was written. Physical-phone testing remains outstanding.

Twenty focused committee/event/navigation tests passed. Typecheck and production build passed; lint completed with eight existing warnings. The full suite has 335 passing tests and the same five known Careers failures. Updated the two older collection-layout expectations to account for the new navigation and visual-only wizard fields.

The first Vercel deployment exposed a configuration-loader difference: Payload's pre-build CLI required an explicit `.ts` extension for the committee step definitions. Corrected that import and verified `payload generate:types` with an isolated temporary output path, plus typecheck. The application build alone had not exercised this loader path.
