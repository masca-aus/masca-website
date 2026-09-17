# Careers CMS migration

Approved in chat on 17 September 2026: replace Google Sheets as the careers source, retain the public design and interactions, follow Events creation style and flow, deploy preview only.

Add a Careers collection with drafts and private unlimited change history. Signed-in CMS users can manage and publish jobs. Public reads only expose published active listings within existing closing/staleness rules. Store internal notes with authenticated field access. Lifecycle changes (close/archive/restore/reopen) are independent of content drafts so they cannot publish unfinished edits.

Use four editor steps: Role and company; Location and eligibility; Application and details; Review and publish. Keep shared navigation, restrained colours, progress line, compact controls, yellow accents and responsive layouts. Fields cover the spreadsheet including stable public ID, featured, title/company/type, country/state/city/work mode, international eligibility/study levels, closing date, application link, industry/eligibility/pay/description/tags, website/logo, added date and private notes. Accept cadet as its own job type. Support rolling deadlines explicitly with an empty closing date. Publishing requires title, company, and a valid application URL/email; incomplete rows remain drafts.

Import the configured CSV once using existing normalisation, keeping unpublished and invalid rows as drafts and private notes private. Preserve existing public slugs including duplicate suffixes. Import is idempotent and does not overwrite edited CMS records. Retain the sheet itself and its reader as import utilities; no live sheet dependency remains in preview careers or diagnostics. Production frontend continues using its deployed code until a later merge.

Schema migration is additive with RLS and revoked direct anon/authenticated database access. Preview uses the production database, so mutation QA uses isolated local PostgreSQL. Verify field access, drafts, published snapshot preservation during lifecycle actions, import repeatability, filters/deep links and editor flow. Push the existing preview branch only; verify Vercel readiness and hosted public page.
