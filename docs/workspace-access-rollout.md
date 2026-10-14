# Workspace catalogue rollout

The catalogue migration seeds the existing nine ownership IDs without assigning people or choosing dates. It converts owning_scope and version ownership to text with catalogue constraints; calendar JSON ownership uses generated constrained columns. Re-running preserves names, tools and terms.

Keep COMMITTEE_ACCESS_ENABLED staged off until the complete membership review and ownership/approval rehearsals pass. Use isolated preview schemas and named localhost databases for synthetic data. Renaming keeps IDs unchanged. Once project content exists, retain workspace-aware enforcement when rolling back: the fixed-scope build or disabling enforcement is unsafe. Do not drop the catalogue, grants, audit or project records.

Use `scripts/review-committee-access.mts --check` after migration. It verifies catalogue references, MASCA identities, reviewed membership data and the protected reminder job. Missing or unmatched owners must be resolved before activation. New working records cannot have an empty owner; calendar history and post presence must match their parent post. Old missing CMS owners remain inaccessible and are reported rather than guessed.

The usual isolated preview initialisers run the catalogue upgrade for their existing schema. They retain the existing Google callback. Keep the production delegation flag unchanged. Test creation, tools, roles, sharing, renewal, removal and conflict recovery in the named localhost databases, then review actual memberships and dates before enabling delegation.

The old `/api/people-access` read endpoint remains compatible. Its unversioned writes now return a refresh-required conflict; use `/api/workspace-access` through the reviewed inline form for mutations and explicit renewal. Never assign current revisions to obsolete requests on behalf of the caller.
