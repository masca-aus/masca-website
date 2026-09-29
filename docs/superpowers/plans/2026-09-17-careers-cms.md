# Careers CMS Implementation Plan

> Execute using superpowers:executing-plans; independent editor work may use superpowers:dispatching-parallel-agents.

**Goal:** Manage and publish careers through CMS while preserving the public experience.
**Architecture:** Payload careers collection, separate private lifecycle collection, public Job adapter, one-time sheet import. Existing board consumes the same Job model.
**Tech Stack:** Next.js 16, Payload 3, PostgreSQL, React, Vitest.
**Spec:** ../specs/2026-09-17-careers-cms.md

## Constraints
Preview only, preserve public UI, private notes and draft versions never public, additive migration, local QA database.

## Tasks
- [x] Add failing domain/access tests for valid publication, private reads, stable IDs, stale/closed visibility and lifecycle transitions; implement collections and helpers. Files: collections/Careers.ts, collections/CareerLifecycle.ts, features/careers/{careerModel,careerLifecycle,publicCareers}.ts, tests/careersCMS.test.ts.
- [x] Add four-step editor and list controls following Events/Committee, native Payload draft/publish persistence, accessible navigation and review. Files: components/admin/CareerEditor.tsx, careerEditor.css, CareerListTools.tsx, features/careers/careerEditor.ts, tests/careerEditor.test.tsx. Collection slug careers; fields from spec; lifecycle endpoint POST /api/careers/:id/lifecycle with action close/archive/restore/reopen.
- [x] Switch public page to getCMSCareerBoard returning existing {status:'ok',jobs:Job[]} contract; replace sheet health with private CMS redirect. Keep frontend components.
- [x] Implement idempotent sheet import using stable source row keys, include drafts/internal notes, test duplicate slug preservation and reruns. Files: features/careers/importCareers.ts and scripts/import-careers.mts.
- [x] Generate additive Payload migration and types/importmap, enable RLS/revoke direct API roles, apply locally. Import sheet locally and verify DB/HTTP workflows without touching remote content.
- [ ] Run focused and broad tests, typecheck, build and browser checks; review patch. Commit and push preview branch, verify deployment, import remote once using reviewed script, verify hosted data and report preview URL.
