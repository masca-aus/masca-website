# CMS Collection UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each existing Payload collection list and document form intuitive for non-technical MASCA committee editors without changing data, workflow rules, or permissions.

**Architecture:** Add reusable collection guidance and safe back-navigation components, then organize existing fields with Payload groups. Shared CSS will make the list and document layouts clear in light and dark themes; no database or public-site logic changes.

**Tech Stack:** Next.js App Router, Payload CMS 3, React, TypeScript, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-09-17-cms-collection-ux-refresh-design.md`

## Global Constraints

- Do not change database tables, field names, migrations, existing records, authentication, access rules, or public-site data contracts.
- Keep public-event access restricted to `reviewStatus = approved` and `_status = published`.
- Preserve Payload search, filters, columns, bulk actions, pagination, history, and unsaved-change protection.
- Keep API views hidden where currently hidden.
- Never communicate a state by colour or icon alone.
- Support both themes, keyboard focus, and reduced motion.

---

## File structure

- `components/admin/CollectionIntro.tsx`: purpose and task guidance above collection lists.
- `components/admin/DocumentBackLink.tsx`: normal, unsaved-change-safe return link for edit screens.
- `components/admin/EventStatusCell.tsx`: current accessible event review badge.
- `app/(payload)/custom.css`: shared list, section, navigation, and theme styling.
- `app/(payload)/admin/importMap.js`: registrations for the two new components.
- `collections/Events.ts`: event list guidance and grouped moderation form.
- `payload.config.ts`: Committee, Media, Sponsors and Users guidance; grouped eligible forms.
- `tests/collectionEditorUX.test.ts`: configuration and copy assertions.

## Task 1: Collection list guidance

**Files:**
- Create: `components/admin/CollectionIntro.tsx`
- Modify: `app/(payload)/admin/importMap.js`, `payload.config.ts`, `collections/Events.ts`
- Create: `tests/collectionEditorUX.test.ts`

**Interfaces:** `CollectionIntro({ description, primaryActionLabel, workflowHint? })` is registered through `admin.components.beforeList` for Events, Committee, Media, Sponsors, and Users.

- [ ] **Step 1: Write the failing test**

```ts
it("registers plain-language collection introductions", async () => {
  const config = await configPromise;
  for (const slug of ["events", "committee", "media", "sponsors", "users"]) {
    const collection = config.collections.find((candidate) => candidate.slug === slug);
    expect(collection?.admin?.components?.beforeList).toContain(
      "/components/admin/CollectionIntro#CollectionIntro",
    );
  }
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- --run tests/collectionEditorUX.test.ts`. Expect failure because the current collections have no `beforeList` component.

- [ ] **Step 3: Implement the smallest component and registrations**

```tsx
export function CollectionIntro({ description, primaryActionLabel, workflowHint }: Props) {
  return <section className="masca-collection-intro" aria-label="Collection guidance">
    <p>{description}</p>
    {workflowHint ? <p className="masca-collection-intro__hint">{workflowHint}</p> : null}
    <span>Use “{primaryActionLabel}” to get started.</span>
  </section>;
}
```

Register the component in the import map. Set collection-specific purpose copy: events explains approval and publishing; committee explains the public directory; media explains image reuse; sponsors explains homepage logos; users explains CMS access.

- [ ] **Step 4: Verify GREEN**

Run `npm test -- --run tests/collectionEditorUX.test.ts tests/payload.config.test.ts`. Expect PASS.

- [ ] **Step 5: Commit**

Run `git add components/admin/CollectionIntro.tsx app/'(payload)'/admin/importMap.js payload.config.ts collections/Events.ts tests/collectionEditorUX.test.ts && git commit -m "feat: explain CMS collection lists"`.

## Task 2: Structured document forms

**Files:**
- Modify: `collections/Events.ts`, `payload.config.ts`
- Modify: `tests/collectionEditorUX.test.ts`, `tests/eventsCollection.test.ts`

**Interfaces:** Payload groups named `publicDetails`, `imagesAndLinks`, `internalDetails`, and `reviewAndPublish` organize existing nested fields. Their visible labels are Public details, Images and links, Internal details, and Review and publish.

- [ ] **Step 1: Write failing tests**

```ts
it("groups Events into editor-friendly sections", async () => {
  const events = await getCollection("events");
  expect(events.fields.map((field) => field.name)).toEqual([
    "publicDetails", "imagesAndLinks", "internalDetails", "reviewAndPublish",
  ]);
});

it("keeps the review decision in the final event section", async () => {
  const events = await getCollection("events");
  const group = events.fields.find((field) => field.name === "reviewAndPublish");
  expect(group?.fields.map((field) => field.name)).toContain("reviewStatus");
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- --run tests/collectionEditorUX.test.ts tests/eventsCollection.test.ts`. Expect failure because fields are currently flat.

- [ ] **Step 3: Implement minimum grouping**

Use Payload `group` fields and preserve every existing nested field's validation, access, relationship, default, and wording. Events: public details contains title through state; images and links contains ticket URL and poster; internal details contains contacts, notes and reviewed date; review and publish contains review status. Committee groups public information and images/links. Sponsors groups public information and logo. Keep Media's upload UI and Users' generated auth fields flat if groups would reduce clarity; their collection guidance is still added. Use `masca-editor-section` and `masca-editor-section--decision` classes.

- [ ] **Step 4: Verify GREEN**

Run `npm test -- --run tests/collectionEditorUX.test.ts tests/eventsCollection.test.ts tests/publicEvents.test.ts`. Expect PASS, including public event access checks.

- [ ] **Step 5: Commit**

Run `git add collections/Events.ts payload.config.ts tests/collectionEditorUX.test.ts tests/eventsCollection.test.ts && git commit -m "feat: structure CMS editor forms"`.

## Task 3: Safe document navigation and visual system

**Files:**
- Create: `components/admin/DocumentBackLink.tsx`
- Modify: `app/(payload)/admin/importMap.js`, `app/(payload)/custom.css`, `collections/Events.ts`, `payload.config.ts`, `tests/collectionEditorUX.test.ts`

**Interfaces:** `DocumentBackLink` uses the current collection route supplied by Payload client props, never `window.history.back()`. It is registered in each collection's edit view before document controls.

- [ ] **Step 1: Write failing test**

```ts
it("adds a back-to-list action to every collection document screen", async () => {
  const config = await configPromise;
  for (const slug of ["events", "committee", "media", "sponsors", "users"]) {
    const collection = config.collections.find((candidate) => candidate.slug === slug);
    expect(collection?.admin?.components?.edit?.beforeDocumentControls).toContain(
      "/components/admin/DocumentBackLink#DocumentBackLink",
    );
  }
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- --run tests/collectionEditorUX.test.ts`. Expect failure because no edit view has the custom back control.

- [ ] **Step 3: Implement the navigation component and CSS**

```tsx
"use client";
import { useRouter } from "next/navigation";
export function DocumentBackLink({ collectionSlug, collectionLabel }: Props) {
  const router = useRouter();
  return <button className="masca-document-back-link" type="button" onClick={() => router.push(`/admin/collections/${collectionSlug}`)}>Back to {collectionLabel}</button>;
}
```

Use custom-component props only if the installed Payload version supports them; otherwise derive the active collection from Payload client config. Do not suppress Payload unsaved-change warnings. Add responsive CSS for collection guidance, editor sections, decision section, back link, dark theme, focus rings, and `prefers-reduced-motion`.

- [ ] **Step 4: Verify GREEN**

Run `npm test -- --run tests/collectionEditorUX.test.ts tests/eventsCollection.test.ts tests/payload.config.test.ts && npm run typecheck && npm run lint`. Expect tests and typecheck PASS, no new lint findings.

- [ ] **Step 5: Commit**

Run `git add components/admin/DocumentBackLink.tsx app/'(payload)'/admin/importMap.js app/'(payload)'/custom.css collections/Events.ts payload.config.ts tests/collectionEditorUX.test.ts && git commit -m "feat: simplify CMS editor navigation"`.

## Task 4: Verification and preview

**Files:** Modify only files from Tasks 1–3 if verification identifies a defect.

- [ ] **Step 1: Run complete checks**

Run `npm test -- --run && npm run typecheck && npm run lint && git diff --check`. Record unrelated pre-existing Careers test failures without changing Careers source.

- [ ] **Step 2: Push the preview branch**

Run `git push origin codex/payload-submission-workflow`.

- [ ] **Step 3: Verify the deployment**

Run `gh api 'repos/masca-aus/masca-website/commits/HEAD_SHA/status' --jq '.statuses[] | select(.context=="Vercel") | [.state,.target_url] | @tsv'`. Expect a Vercel `success` deployment.

- [ ] **Step 4: Check the protected CMS preview**

Sign in and inspect Events, Committee, Media, Sponsors, and Users for readable guidance, useful form sections, status labels, back navigation, both themes, keyboard focus, and unchanged unsaved-change protection.

- [ ] **Step 5: Hand off without merging**

Report preview URL, branch, commits, verification evidence, and any unrelated existing failures. Do not merge to `main` without separate user approval.
