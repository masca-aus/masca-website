# MASCA Website — Handoff

## Current workspace

- Repository: `masca-aus/masca-website`
- Worktree: `/Users/syedfahmi/Documents/Masca National/worktrees/payload-submission-workflow`
- Branch: `codex/payload-submission-workflow`
- Latest commit: `beab587` — `style: simplify CMS collection lists`
- Working tree: clean at the time of handoff.

## Preview environment

- CMS preview: https://masca-website-git-codex-payload-submission-workflow-masca-au.vercel.app/admin
- The Vercel deployment for `beab587` completed successfully.
- This work has **not** been merged into `main`. Do not merge or deploy production without the user's explicit approval.

## What has been delivered on this branch

### Events workflow

- An isolated `events` collection supports event submissions and review.
- Public events require both `reviewStatus: approved` and Payload status `published`.
- Review status is shown with clear colours in the list:
  - approved: green
  - pending: amber
  - rejected: red
- The review-and-publish stage is visually emphasised at the end of the event form.
- Payload's “Versions” tab was renamed to **Change history** and the event API tab was hidden.

### CMS usability

- Light theme is the default; a light/dark toggle is in the top-right admin bar.
- All collection document screens have a clear back-to-list link.
- Event, Committee and Sponsor forms use visual-only section headings. These are Payload `ui` fields, not nested field groups, so they do not change the existing database shape or records.
- Event, Committee, Media, Sponsors and Users lists now use plain-language guidance below their normal Payload heading.
- The former large custom banner above each list has been removed.
- Desktop list tables are centred in a wider `96rem` workspace; document forms use a narrower `76rem` workspace.

## Important implementation notes

- Do not reintroduce Payload `group` fields for the visual sections. That could change field paths and create a data migration risk. Use `utils/editorSection.ts` for any new visual-only form section.
- Event data is public only after review approval plus publish status. Preserve this condition in `collections/Events.ts`.
- The admin import map at `app/(payload)/admin/importMap.js` is maintained manually. Add or remove entries whenever custom Payload admin components change.
- The user prioritises non-technical committee editors, a professional interface, fast perceived navigation, and no unnecessary database changes.

## Key files

- `collections/Events.ts` — events schema, approval/public-read rules, form sections.
- `payload.config.ts` — Users, Media, Committee and Sponsors configuration.
- `app/(payload)/custom.css` — CMS theming, centred forms/tables, list and status styles.
- `components/admin/ThemeToggle.tsx` — admin theme switcher.
- `components/admin/EventStatusCell.tsx` — coloured event review-state cell.
- `components/admin/EditorSection.tsx` and `utils/editorSection.ts` — safe visual-only editor sections.
- `components/admin/DocumentBackLink.tsx` — document navigation.
- `components/admin/MascaDashboard.tsx` — custom CMS dashboard.

## Verification status

The latest CMS UI change was verified with:

```sh
npm test -- --run tests/adminLayout.test.ts tests/collectionEditorUX.test.ts
npm run typecheck
npm run lint
git diff --check
```

- Focused CMS tests: 6 passed.
- Typecheck: passed.
- Lint: exited successfully with 8 pre-existing warnings in Careers/public-image files and `utils/horizontalLoop.js`; this CMS change introduced no lint warnings.
- The full test suite has 5 known, unrelated Careers failures. Do not change Careers behaviour unless the user specifically asks; they asked to preserve Jin's work.

## Suggested next steps

1. Ask the user to review the CMS preview at the link above.
2. Make any approved UI refinements on this branch, keeping database changes out of scope unless explicitly requested.
3. When the user explicitly requests release, open/review a pull request and merge only after checks and user confirmation.
