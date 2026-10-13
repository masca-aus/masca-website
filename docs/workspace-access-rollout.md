# Workspace catalogue rollout

The catalogue migration seeds the existing nine ownership IDs without assigning people or choosing dates. It converts owning_scope and version ownership to text with catalogue constraints; calendar JSON ownership uses generated constrained columns. Re-running preserves names, tools and terms.

Keep COMMITTEE_ACCESS_ENABLED staged off until the complete membership review and ownership/approval rehearsals pass. Use isolated preview schemas and named localhost databases for synthetic data. Renaming keeps IDs unchanged. Once project content exists, retain workspace-aware enforcement when rolling back: the fixed-scope build or disabling enforcement is unsafe. Do not drop the catalogue, grants, audit or project records.
