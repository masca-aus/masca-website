# Google Workspace sign-in and People & access

Status: repository review complete; domain and publishing policy confirmed; Google Cloud verification pending. No authentication or permission changes deployed.

## Intended experience
An administrator approves an exact Workspace email and assigns a role plus department/state grants. Approved people use Continue with Google. Unapproved, suspended or mismatched identities cannot enter the CMS. The CMS never collects a Google password. Existing access must not be expanded by default during migration.

## Account model
- Administrator: manages approved accounts and content grants.
- Editor: manages only content covered by explicit grants.
- Grant: collection/department and owning scope (QLD, NSW, VIC, ACT, SA, WA, TAS, NT, or National). Keep grants paired rather than using separate arrays that accidentally create cross-product permissions.
- Account status: invited, active, suspended. Only an administrator may alter permissions, approved email, status or identity binding.
- Google subject: bind the approved email to the verified stable Google identity on first successful sign-in. Do not silently rebind an identity when email changes.
- Audit changes to grants and status without storing tokens or credentials.

## Ownership and visibility
Careers currently has free-text country/state fields, which are unsuitable as authorization keys. Add a controlled owning scope independently of display location. National ownership covers cross-state and Malaysia content. Do not infer ownership from unstructured text during migration: unresolved records require administrator assignment. Editors cannot move content beyond their grants.

Public published content remains publicly readable. Private drafts, versions, internal notes and lifecycle history are restricted by scope. Editors must not gain broader private access simply by authenticating. Server collection access must cover listing, single-record reads, creation, edits, deletion, versions, reports, exports and custom lifecycle/status endpoints.

Review media and organisation relationships as well: common public assets can be selected, but unrestricted editing/deletion of shared assets must not follow automatically from editor access. Dashboard counts and navigation must reflect effective permissions.

## Authentication
Use Google authorization-code flow with a maintained OpenID Connect library. Validate state, nonce, PKCE, token signature, issuer, audience, expiry, email verification and Workspace hosted-domain claim. Allow only configured domains AND an approved exact email. Request identity scopes only, not Drive/Gmail access. Use a fixed configured callback URL and reject arbitrary redirects.

Create a secure HttpOnly, same-site CMS session only after approval and identity verification. Enforce current account status and permissions server-side on authenticated requests. Suspension and grant changes must revoke existing sessions; unsuspending must not revive old sessions. Protect last-administrator access and prevent self-escalation.

## Rollout
1. Configure approved Workspace domains and publishing policy.
2. Choose Google Cloud project and configure consent/client/callback; place secrets in deployment configuration, never chat or source control.
3. Build access-policy tests before runtime integration.
4. Implement People & access and controlled content ownership with migrations.
5. Wire all collection, field, custom endpoint and dashboard access checks.
6. Integrate Google sign-in and session invalidation.
7. Test against an isolated preview database, not the production database. Do not run authorization migrations through the existing preview until its database isolation is confirmed.
8. Explicitly identify the initial administrator and review legacy accounts/content ownership before enforcement. Do not promote every existing account automatically.
9. Verify approved login, rejected login, suspension, session revocation and every scope boundary before live rollout.

## Acceptance checks
- QLD Careers editor can manage QLD-owned careers, not NSW/private national records or user settings.
- Changing IDs, API payloads, ownership, bulk actions or version endpoints cannot escape scope.
- Public site continues to show published content across all scopes.
- Reports and CSV exports contain only authorized private records.
- Invalid Google issuer/audience/nonce/domain/email and unapproved or suspended accounts are denied.
- Concurrent changes cannot remove the last administrator or bypass suspension.
- Login failure, expired session and access-denied screens are clear and keyboard accessible.

## Pending user input
- Confirmed: only masca.org.au initially.
- Confirmed: editors can publish within their assigned scope.
- Google Cloud requires admin@masca.org.au identity verification before projects can be inspected.

## Primary references
- https://developers.google.com/identity/openid-connect/openid-connect
- https://payloadcms.com/docs/authentication/custom-strategies
- https://payloadcms.com/docs/authentication/overview
