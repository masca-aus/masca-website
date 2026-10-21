# Committee Access Implementation Plan

> **For agentic workers:** Use the testing and verification workflows. Implement the approved design without asking again for permission.

**Goal:** Scoped CMS/calendar access, bounded delegation, sharing and committee handover.
**Architecture:** Account-level JSON memberships carry committee, area role sets, manager status and term end. Pure central policy accepts resource ownership and explicit sharing; database/request boundaries reload current accounts. Server rollout flag decorates accounts with committee mode, keeping legacy operation intact until reviewed activation.
**Tech stack:** Next.js, Payload, PostgreSQL, React, Vitest; existing Google OIDC and private calendar storage.
**Spec:** docs/superpowers/specs/2026-10-13-committee-access-design.md

## Global constraints
- MASCA accounts only. Private drafts. No self-approval. No fabricated term dates.
- Platform administration does not grant content rights in committee mode.
- No live permission/configuration change until migration readiness is verified.
- Public submissions/published pages remain accessible. Check private assets, history, counts, presence and search.

## Review focus
- Manager editing a multi-committee account cannot mutate other memberships or global status.
- Share revocation/expiry during caption updates or uploads must revoke subsequent access.
- Published document access cannot expose draft versions or private metadata.
- Simultaneous membership changes must not overwrite each other.
- Legacy activation must fail when review/term data is incomplete.

## Tasks
### 1. Shared policy and membership contracts
- [x] Test allowed/denied role, expiry, manager and record sharing combinations.
- [x] Add committeePolicy.ts with fixed scopes/areas, Viewer/Editor/Approver roles, membership validation, active scopes, record actions and bounded delegation validation.
- [x] Extend ApprovedAccount with memberships and transient accessModel; existing helpers use new policy only in committee mode.
- [x] Verify policy and existing policy tests.

### 2. CMS content boundaries and account UI
- [x] Add membership/manager UI, workspace selection, delegation API and account decoration on authentication/read.
- [x] Enforce scoped reading/editing/publication/history, add record sharing and independent approval hooks for website content, restrict uploads and dashboard/search.
- [x] Test delegated escalation, unchanged foreign memberships, publication gates and privacy filters.

### 3. Calendar isolation and sharing
- [x] Add owningScope/sharedWith to posts; scope creation/listing/categories/presence and all detail/action/asset/collaboration boundaries.
- [x] Populate record-specific eligible teammates; add sharing UI and permitted-workspace switcher; prevent share recipients from workflow/deletion escalation.
- [x] Test cross-state guessed IDs, collaboration revocation, media permissions, share-only access and independent approval.

### 4. Migration, handover and release verification
- [x] Add additive idempotent migration and legacy report; keep dates unset until supplied, activation guard requires review.
- [x] Add idempotent 30/7-day in-app manager reminders, renewals and audit history.
- [x] Exercise real PostgreSQL isolation/concurrency and migrations locally; run all tests/build/lint and whole-branch review.
- [ ] Create reviewable PR/preview with staged rollout documentation; enable live delegation only after actual terms and legacy review exist.
