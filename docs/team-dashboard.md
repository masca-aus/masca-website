# Team dashboard rollout

The CMS homepage prioritises work and tools using optional account Departments,
existing content permissions and National/state ownership scopes. Department
membership never grants viewing, editing or account-management access.

## Account setup

Administrators can select multiple Departments under People & access. Existing
accounts remain unassigned and retain the standard section order. Chairs use the
standard order. Careers prioritises Careers; Amplifies prioritises Media and
Events; Cares and Unites prioritise Events; Treasury prioritises Sponsors;
Secretariat prioritises Committee and Organisations. Priorities are deduplicated
and inaccessible sections are omitted. The first three accessible sections are
Team tools; the remainder appear under Other content.

The branch selector uses the union of existing editable ownership scopes. It
defaults to All my branches; administrators and all-content editors can select
any existing scope. Invalid or repeated branch parameters fall back to All my
branches. View-only accounts have browsing shortcuts and no editing queues.

Tasks query only paired area/branch editing grants with request-scoped Payload
access checks. Counts use draft-enabled find totals, matching latest saved
versions rather than base published documents. Careers queues exclude manually
archived/closed and automatically expired published opportunities, matching the
current Careers list. Count links serialize the same filters. Recent drafts are
merged across Events and Careers, sorted by update time and capped at three.
Creating a scoped record from a selected branch prefills that branch only after
server-side permission validation. Media and Organisations remain shared tools.

Website insights are whole-website production reports, unaffected by branch or
department selection. Active approved Workspace members, including viewers, can
read them; credentials remain on the server. Analytics uses a Suspense boundary
and failed task collections show unavailable rather than invented zero counts.

## Additive migration and review

`migrations/20261008_033000_account_departments.ts` prepares the public rollout.
The concrete SQL is saved in `docs/account-departments.sql`. It adds only the enum and `users_departments` multi-select table expected by
Payload, with order and parent indexes and an account foreign key. The table has
RLS enabled and direct anon/authenticated privileges revoked. Existing account
rows and permissions are unchanged. The down migration deliberately refuses to
delete memberships; roll back application code to preserve them.

The migration has been rehearsed twice for each supported schema using a
throwaway embedded PostgreSQL instance. Existing users and permissions were
preserved, multiple assignments round-tripped, orphan assignments were rejected,
and RLS/role grants were checked. This is local verification, not a migration
against the remote production database.

Public database rollout requires database-owner review before a migration-enabled
build. Do not run the project's migration build for this Preview. Preview upload
uses a temporary source export with its build command overridden to:

    node --experimental-strip-types scripts/prepare-team-dashboard-preview.mts && npm run build

That preparation refuses non-Preview deployments and only adds the membership
table to `cms_auth_preview` when Workspace authentication is enabled. It cannot
alter public account/content tables or initialise a missing authentication schema.
Legacy password mode skips department preparation and retains its shared view.
This project stores Workspace Preview settings specifically for
`codex/workspace-access`; the CLI source export must supply
`--meta githubDeployment=1 --meta githubCommitRef=codex/workspace-access`
to load that existing configuration. General Preview deployments use legacy
sign-in. No authentication environment variables were changed.
The existing preview initializer also prepares the membership table for future
Workspace preview builds. No content ownership or permission migration is needed.

## Checks

Focused tests cover department ordering, multiple/unassigned accounts, paired
scope permissions, malicious/invalid branch input, matching list filters,
view-only and inactive accounts, draft-version counts, lifecycle/expiry filtering,
shared analytics access and empty/unavailable states. Type checking and lint cover
all changed code. Browser layout previews use the real dashboard components with
clearly marked sample content; they cover desktop/mobile, light/dark, viewers,
empty and connection-failure states. A signed-in deployed check is still required
for real account assignment, branch navigation and streamed analytics.

## Preview source compatibility

The current feature branch includes separate committee-drafts work whose schema
is not present in the isolated Workspace Preview. Its build failed on the
missing committee `_status` column. The final Workspace upload therefore uses
`origin/codex/workspace-access` as its source-export base plus these dashboard
changes, with the new optional account types and migration registration applied
to that base. This keeps the Preview on its matching content schema. The local
feature worktree and unrelated changes are preserved. General password-mode
Preview builds also succeeded, but do not exercise team accounts.

## Deployed Workspace Preview

Preview is Ready at https://masca-website-git-codex-workspace-access-masca-au.vercel.app/admin. The existing Workspace Preview alias points to deployment dpl_4VocBM4t53zKeSEnwemDNGDKoiET so the configured Google callback returns to this build. The private department preparation and production build succeeded; /admin returned HTTP 200 and Google sign-in returned HTTP 307 to accounts.google.com. Real signed-in account and live analytics verification remains pending. The public migration and production release have not been run.

Width refinement: dashboard now uses the full available content width with responsive 16–40px horizontal padding. Browser checked at 1920px and 390px without horizontal overflow. Preview deployment dpl_24KiGAsunLNnRSs1v6nK47vcFSLT is Ready.

Visual refinement: larger 30–40px workspace title, 22px section headings, readable 14–16px supporting text, 46px actions, 48px tool icons, subtle panel shadows and theme-aware canvas. Sidebar retains Dashboard above Content with larger navigation targets. Browser checks cover 1440px desktop and 390px mobile, both themes, analytics failure and viewing-only tools. All 40 focused tests passed after the CSS changes.

Visual refinement Preview build dpl_35KK7rY4dZ5pZvmARxgtJuAte7sB is Ready; existing Workspace Preview alias updated. Production remains unchanged.

Simplification after visual review: one work panel with inline collection counts and three recent drafts; at most three scoped quick actions, with only the first editing action highlighted. Full content navigation and People & access remain in the sidebar. Department context and tutorial are under Workspace info. Website totals remain visible; breakdowns, report dates and explanatory notes expand on demand. Removed duplicate content cards and dashboard account footer. All 40 focused tests, typecheck, lint and whitespace checks passed. Sample-content browser checks covered desktop/mobile, both themes, empty/view-only/failure states and expandable details.

Simplified Workspace Preview is Ready: dpl_FXfHvwyBbgRhumwZFauKSn7jvKLi. Existing Preview alias points to this build. Production remains unchanged.

Content-first dashboard (approved white layout): replaces task panel/shortcuts with one list of permitted sections, live published/active totals and branch-safe Add links. Published base counts exclude unpublished versions; Events exclude archived records, Careers reuse active lifecycle/expiry filtering. Committee draft support is detected from collection configuration to support both current code and the existing immediate-save Workspace Preview. Latest editable drafts and review links remain separate. Website traffic is collapsed by default. No new migration or reporting integration. 44 focused tests, typecheck and changed-file lint passed. Browser sample layout verified white background, collapsed/expanded traffic, mobile fit and viewing-only tools. Signed-in live totals still require account verification.

Content-first Preview is Ready: dpl_745gLKMSgtVJyK7ababJcgBPqf5k; existing Workspace Preview alias updated. Production remains unchanged.

Width alignment: dashboard now uses the same centred 96rem maximum width and --gutter-h horizontal padding as collection list pages. Preview dpl_CR5brjVAF1UdzmMxn3Rv7d6nQhdc is Ready and the existing Workspace Preview alias points to it. Server login smoke response contained the Google sign-in and welcome content without an application-error response. The in-app browser showed a blank login view, so signed-in visual verification remains pending; no authentication settings were changed.

Final approved direction: restore the original workspace Content/Resources tools with Manage and Add actions, adding only Published, Drafts and To review summary cards. Published totals cover live branch-scoped Events, active Careers, Committee and Sponsors; resources are excluded. Draft/review totals cover editable Events and Careers, with per-collection destinations. Unavailable totals show a dash, never a fabricated zero; viewing-only members get Published and Browse without editing cards. Recent drafts, shortcuts and website traffic panels are removed from this dashboard. Existing analytics modules are retained but not loaded here. White light theme and the same centred 96rem width remain. 44 focused tests, typecheck, lint and whitespace checks passed; sample layout checked at desktop and a narrow responsive viewport in both themes.

Original-layout-plus-cards Preview is Ready: dpl_DkAp63dZzBs6xAU8f48fRC5Tun46. Existing Workspace Preview alias updated. Production remains unchanged. Signed-in live account verification remains pending.

Targeted branch-picker polish: DashboardBranchPicker reuses the existing ReportSelect interaction model with full branch names, a selected checkmark, keyboard/typeahead navigation, Escape/outside-click dismissal and 44px controls. Options still come from the server-derived allowed branches; Apply submits the same GET branch parameter. Styling is scoped to the dashboard, supports both themes, and adds no library. 14 focused picker/dashboard/ordering tests, typecheck and changed-file lint passed. The real client picker was exercised in the labelled local layout preview.

Branch-picker Preview is Ready: dpl_CvBMrhA9f133hY3ts3vtkDKqkxDs. Existing Workspace Preview alias updated. Production remains unchanged.

Targeted card polish: small themed status icons, prominent totals, aligned two-column collection links and consistent borders/dividers. White light-theme cards remain compact; data and permission filtering are unchanged. 14 focused tests, typecheck, changed-file lint and whitespace checks passed. Sample layouts checked on desktop and 390px mobile in both themes without horizontal overflow. Preview dpl_AaJuAS5PBLwKAJn84q2h7Khjwc3v is Ready; existing Preview alias updated. Signed-in live account verification remains pending.

Approved Ghost-inspired workspace design and Metrics view: compact typography, neutral status icons, lighter borders, compact dashboard navigation and a yellow primary content action. Workspace remains the default; Metrics is addressed by /admin?view=metrics and retains branch in tab links and branch form submissions. Metrics links disable prefetch so website reports are loaded only when requested. Metrics streams the existing server-only Vercel report independently, adds a validated daily traffic series, accessible responsive SVG line charts and an exact-value table, top-page/source bars, and branch-scoped published-content bars. Whole-website traffic covers the existing seven-day window; content is labelled as a current snapshot. Daily buckets are UTC with partial edges, missing buckets are gaps, and daily visitor counts never determine period totals. No new library, integration, migration or production deployment. 53 focused tests, typecheck, changed-file lint and whitespace checks passed. The live daily aggregate endpoint returned HTTP 200 with timestamp/visitors/pageviews rows. Sample-content browser checks cover light/dark, desktop/mobile, empty/failure states, branch context and both tab links. Signed-in Preview verification remains pending. Deployment dpl_DRfvBJZ9Jm3NMckAMw9vPVAfev3W submitted and queued for a Vercel build slot.

Metrics Preview is Ready: dpl_Aqsezs7yerhKUU2qbPZz12anemsn; the existing Workspace Preview alias now points to this build. Deployment packaging was restored from baseline 705fe89 after older files disappeared from the temporary export. A durable recovery copy is in outputs/team-dashboard-preview-deploy-srjkwu1a; deploy from the isolated path recorded in /tmp/masca-team-dashboard-deploy-path to avoid inheriting the unrelated parent magazine repository's Git metadata. The rebuilt export passes typecheck and Vercel build. An unauthenticated request to /admin?view=metrics redirects to Vercel SSO. Signed-in application verification remains pending. Production is unchanged.

Seamless dashboard tabs: Workspace and Metrics now stay mounted and switch locally without a page navigation. Native browser history keeps `view` and the applied branch shareable; Back/Forward restores the tab. Keyboard arrows, Home and End operate the accessible tablist. The branch form reads the current view, and tab changes retain expanded daily data. Website reports now preload inside their independent server Suspense boundary while Workspace remains usable. Both views retain the existing permission-filtered data. Workspace info is removed; Tutorial and View website are direct header actions. Tutorial steps follow the active panel. All 56 focused tests, source and isolated-package typechecks, changed-file lint and whitespace checks passed. Local sample-content checks verified retained daily details, history, direct tutorial, mobile dark layout and no horizontal overflow. Preview deployment dpl_2ny5fvCWbxzWA4jYcAMPmwro1vFd submitted; signed-in verification remains pending.

Seamless-tabs Preview is Ready: dpl_2ny5fvCWbxzWA4jYcAMPmwro1vFd. The existing Workspace Preview alias was successfully updated to this deployment. No production release was performed. Signed-in application verification remains pending.

Focused Metrics motion polish: full-size loading placeholders replace the compact loading sentence, matching the report's total cards, responsive plot and five-row breakdown areas. Sample populated reports and loading states measured the same height at 1280px desktop and 390px mobile. Metrics cards fade up by 6px over 360ms with a short stagger; chart series reveal left-to-right while preserving dashed visitors and missing-date gaps; bars expand from the left. Numbers remain their real reported values throughout. Motion and placeholder shimmer apply only when reduced motion is not requested. Existing mounted tabs and independent streaming are unchanged. Twelve focused tests, source and isolated-export typechecks, changed-file lint and whitespace checks passed. Browser checks covered loading-to-ready, dark mobile, desktop, overflow and no console errors. The local sample preview includes a Preview loading control to replay the transition; this control is not included in the CMS deployment. Preview deployment dpl_Cu2EksVWYEorWK2tovuSwX8E35rw submitted; signed-in verification remains pending.

Metrics motion Preview is Ready: dpl_Cu2EksVWYEorWK2tovuSwX8E35rw. The existing Workspace Preview alias now points to this build. Production was not released; signed-in application verification remains pending.

Interactive daily traffic and consistent tab motion: the chart is now a client component receiving only the existing aggregate rows. Pointer position selects the nearest UTC date, with a guide line, highlighted points and an edge-clamped tooltip. Tap retains the readout; vertical touch scrolling is preserved. A keyboard date slider supports Left/Right, Home/End and Escape and announces both values through aria-valuetext. Missing dates remain Unavailable, genuine zeros stay zero, partial boundary days are labelled, and the exact-value table remains available. Workspace and Metrics share the same entrance keyframe and timing; Workspace cards and sections enter with a small stagger. No new fetch or reporting integration was added. Twenty-two focused tests, typechecks, changed-file lint and whitespace checks passed. Browser checks covered direct chart selection, keyboard inspection, mobile edges, dark mode, and Workspace animation styles. The local demo now mounts the actual interactive report instead of static report HTML. Preview deployment dpl_5mq8EvR4YtGgcVHHnHWRhw3a9fGK submitted; signed-in application verification remains pending.

Interactive chart Preview is Ready: dpl_5mq8EvR4YtGgcVHHnHWRhw3a9fGK. The existing Workspace Preview alias was updated successfully. Production was not released. Signed-in application verification remains pending.

Chart cursor polish: use the standard arrow cursor over the plot. The readout fades in over 140ms and its horizontal position transitions over 120ms; the guide fades in over 120ms. These effects are gated by prefers-reduced-motion. The change is CSS-only. Local browser verification confirmed cursor=default, the intended animation/transition timings, changing date values and no console errors. Whitespace checks passed. Preview deployment dpl_AuKacdDvnxbDe7FvngdGGRMCikxD submitted.

Chart cursor Preview is Ready: dpl_AuKacdDvnxbDe7FvngdGGRMCikxD. The existing Workspace Preview alias was updated successfully. Production remains unchanged; signed-in application verification is pending.

Daily-data disclosure motion: replace the instant native disclosure with an accessible button and a CSS grid panel that rolls open/closed over 260ms with a 180ms fade. Closed content is inert and hidden from assistive technology. The table stays mounted, focus stays on the trigger, and expansion survives Workspace/Metrics switches. Reduced motion uses immediate expansion. Thirteen focused checks, source/export typechecks, changed-file lint and whitespace checks passed. Local browser verification covered zero collapsed height, full expanded height, keyboard Space collapse and state retention across tabs. Preview deployment dpl_96zRJ3rPjC9NzWbV31Voc74RJGa6 submitted.

Daily-data disclosure Preview is Ready: dpl_96zRJ3rPjC9NzWbV31Voc74RJGa6. After resuming the interrupted rollout, confirmed the shared alias still referenced the prior chart-cursor deployment, then updated it successfully to this build. Production remains unchanged; signed-in application verification is pending.

Workspace visual fixes: content rows now have 12px side padding and 8px rounded hover surfaces, with hover backgrounds limited to hover-capable pointers. Increased spacing beneath section headings. Summary cards respond to available dashboard width including sidebar space: stack below 640px, use single-column collection links in narrow cards, avoid mid-word wrapping, and reserve consistent caption height to align dividers. Header controls wrap when needed. CSS-only change; no data or permission changes. Local sample browser checks covered 390px, 900px, 1050px and 1280px widths, light/dark themes, no horizontal overflow, aligned card dividers, dropdown layering/dismissal and Workspace/Metrics switching. Whitespace checks and isolated Vercel build passed. Preview dpl_6LvTgHJnyQCSRHm1a4Sxf9KeK7aD is Ready and the existing Workspace Preview alias was updated successfully. Signed-in live verification remains pending; production remains unchanged.

Smoother CMS navigation (2026-10-10): removed the catch-all loading boundary that replaced the entire Payload page, including its sidebar, with a progress-only blank view. Existing route transitions now retain the current page until its replacement is ready. Use Payload's existing delayed progress bar and transition lifecycle instead of a second click-tracked indicator that could remain active after cancelled navigation. Fade the new content over 150ms only when reduced motion is not requested; no intentional navigation delay and no remount just for animation.

AdminLink bridges standard Next links into Payload transitions, preserving normal modified clicks and existing unsaved-edit guards. Dashboard branch Apply uses client navigation with the same validated branch/view query and a normal GET fallback. Dashboard, section return links and sidebar list links remember the last list query and scroll position in memory for the current signed-in account. Explicit summary filters remain authoritative. Remembered context contains URLs/scroll only, never records, and resets when the account changes. Hover and keyboard focus warm read-only landing views; logout, authentication routes, editors, downloads and external links are excluded from custom prefetching. Prefetch invalidation permits rewarming stale routes. Existing save and refresh flows remain in place.

Verification: 33 focused tests passed in source and the isolated deployment export, along with both typechecks, changed-file lint and whitespace checks. A local Next navigation fixture using the actual navigation components and 1.2-second server delay showed the current workspace/sidebar remaining visible during loading, retained light/dark state across navigation, and restored branch=QLD&page=3 plus scrollY=531 when returning from an editor. The fixture uses sample content and a substitute authentication/transition provider; signed-in Payload verification remains pending.

Full working-tree suite: 569 passed, 10 failed across five existing committee/careers test files. Failures are outside the changed navigation behavior: careersSource.test.ts (getCareerBoard clean sheet read); collectionEditorUX.test.ts (heading guidance and committee drafts expectations); committee.test.ts (required portrait, public read access, revalidation and missing portrait mapping); committeeEditor.test.ts (portrait validation); committeeEditorFields.test.tsx (review/save and server-error tests have an outdated mock missing SaveDraftButton). These existing committee draft/portrait changes and time-sensitive careers fixtures were left untouched. The earlier route-loading markup test was removed with the superseded blank-screen loading component; navigation behavior is covered by the new tests.

Navigation Preview is Ready: dpl_5LjVpJzX1mrygzJuypSxs8zbhAqF. Confirmed the shared alias still referenced the previous visual-fix deployment, then updated it successfully. Production remains unchanged. Signed-in Payload account verification remains pending.

Light section-switch animation: incoming collection lists/editors fade from 90% opacity and rise 3px over 180ms. The sidebar and app header stay still. Motion runs only when the pathname changes, so filter/pagination changes and data refreshes do not replay it; reduced-motion skips it. The dashboard keeps its existing coordinated animations. Ten navigation checks, typecheck, lint and whitespace checks passed. Local Next browser checks measured an in-flight Committee transform of 2.44px/opacity 0.919 with no sidebar transform, and no motion after a same-section query change. Deployment dpl_5vX1ohqbJsSE93y1XACCkvsvtqEC submitted for Preview.

Section-motion Preview is Ready: dpl_5vX1ohqbJsSE93y1XACCkvsvtqEC. The shared Workspace Preview alias was updated successfully. Production remains unchanged; signed-in Payload verification remains pending.

Sidebar colour transition: Dashboard neutral icons and tool-section coloured icons now fade between their appearances in both directions over 220ms, with a subtle navigation-label opacity transition. A layout effect handles sidebar DOM replacement before paint, using current-theme CSS variables. No sidebar movement, artificial delay, or replay for ordinary tool-to-tool navigation; reduced motion skips the effect. Ten focused navigation tests, typecheck, changed-file lint and whitespace checks passed. Browser checks used the actual MascaNav component in the local sample-content fixture, verified both directions and dark-theme colours. Preview dpl_H1puGQQQS1Tv4w7yjniQ35SxL99Q is Ready and the shared Workspace Preview alias was updated successfully. Signed-in Payload verification remains pending; production remains unchanged.

Unified sidebar: one compact appearance for Dashboard and content tools, preserving all section-coloured icons. Dashboard now uses a matching icon tile. Links use 14px text, 44px targets and the same spacing; Settings is always labelled. A soft MASCA-yellow active-page fill fades in over 160ms, gated by reduced-motion preferences. Removed the obsolete dashboard/tool icon-colour animation and dashboard-only typography overrides. Existing permissions, route memory and responsive navigation behaviour remain intact. Ten focused navigation tests, typecheck, changed-file lint and whitespace checks passed. Local sample-content browser checks verified identical link positions/heights/colours across Dashboard and tools, plus light/dark rendering. Signed-in Payload verification remains pending.

Unified-sidebar Preview is Ready: dpl_5mLSrn3KFMA7jbvHwWAsvRSn6DHN. The existing Workspace Preview alias was updated successfully. Production remains unchanged.

Sidebar selected-state polish: use light blue-grey #EEF2F6 with a 3px MASCA-yellow inset marker and bold text. Hover uses lighter #F7F7F8, while dark mode uses #29323E selected and #22262C hover. Section icon colours remain unchanged. The existing 160ms motion and reduced-motion handling use the new selected colour. CSS-only; whitespace checks passed and local browser checks confirmed exact light/dark fills and marker size.

Selected-colour Preview is Ready: dpl_7zNhDsR3SDvPMJB5peFJ6VP54wY9. Shared Workspace Preview alias updated successfully. Signed-in Payload verification remains pending; production unchanged.

Workspace speed and Events workflow (2026-10-12): the authenticated dashboard returns its tools before summary queries resolve, with permission-aware loading cards in a local Suspense boundary. Workspace and Metrics share the same content-count promise; website analytics stream independently. Summary-only draft queries retain draft=true/latest-version semantics and access checks while selecting only status, limiting results to one and avoiding updatedAt sorting. No draft titles or dates are loaded for the dashboard.

Events now has explicit branch and publication-status controls. View changes preserve search, owning-scope filters and display preferences, reset pagination, and clear conflicting status/review predicates; generated dashboard archived-ID exclusions are removed when changing lifecycle views. Reset clears search/extra filters while retaining branch and current/review/archived context. Review empty states, filtered-empty guidance and current/archived navigation are explicit; no create permission is inferred by empty states. Reports mount and download on first open and remain mounted after closing. Existing autosave, status feedback, errors and publishing permission checks are preserved. Other tool list UIs are unchanged.

Removed the 1.2-second artificial delay from the local navigation fixture and restarted its server. The fixture contains actual Events controls/query helpers with sample rows and substitute auth/report data. Browser verification was blocked by browser security policy, so visual and signed-in Payload verification remain pending. Source and isolated-export typechecks plus 78 focused tests passed; changed-file lint and whitespace checks passed. Tests cover a usable shell with unresolved counts, shared resolved totals, scope-safe queries/links, Events filters/empty states, on-demand reports and existing save workflows. No production performance timings are claimed. Shared Workspace Preview currently points to newer Media Calendar work (dpl_BcaEwVeqQutCqMpnzv1DzuH9zk5c), so this pass is deployed separately instead of replacing that alias.

Workspace-speed Preview is Ready: dpl_BhP3BcieeE5CPMhnu5n4eRg12mjc, https://masca-website-gj4g523gr-masca-au.vercel.app/admin. Build succeeded. Shared Workspace Preview alias and production were left unchanged to preserve newer Media Calendar work.
