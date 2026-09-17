# One-time Careers import

Use Node 22.13 or later and the intended CMS database environment. The source is read from `CAREERS_SHEET_ID` and `CAREERS_SHEET_GID` (or the existing `CAREERS_CSV_URL` override).

Preview without creating records:

```sh
npm run payload -- run scripts/import-careers.mts
```

Apply the reviewed import to the configured CMS database:

```sh
npm run payload -- run scripts/import-careers.mts -- --apply
```

The second `--` passes `--apply` through Payload's command parser. The `.mts` entrypoint awaits completion before Payload exits.

The preview prints counts and row warning counts without private notes or source cell values. Valid published rows import as published; incomplete or invalid rows stay drafts. Invalid dates remain available for correction. Existing public slugs are preserved, and every imported row has a unique source key containing spreadsheet ID, tab ID and row number. Re-running skips existing source keys and never overwrites CMS edits. Keep the source sheet's row order unchanged between interrupted runs.

For mutation QA, use the isolated local database only. Do not load production or preview database credentials into a local import test.

The preview deployment shares the production database. Deploying the preview frontend does not isolate database mutations. Apply to that shared database only as part of the explicitly approved migration; leave the production frontend on its deployed code until the later merge. Preserve the Google Sheet unchanged as a source and backup; it is no longer a live dependency of the CMS-backed board.

## Local verification (17 September 2026)

The CLI was exercised against the isolated local QA database with a four-row CSV fixture: one valid published cadet role, one unpublished role, one invalid closing date and one invalid application link. Dry-run reported 4 pending records and created none. Apply created 4 records (1 published, 3 drafts). Repeating apply created none and skipped all 4. The invalid date was preserved for editor correction. Type checking and all 17 import unit tests passed.

The actual source sheet was subsequently identified through Google Drive and verified against the known John Holland, Gamuda, WT and WSP listings. Its local dry-run reported 12 source records. After recognizing “All Year Round” and “No close” as rolling deadlines and preserving overlong raw draft text, the verified import plan contains 7 published records and 5 drafts, with 2 row warnings. The two affected local QA records were corrected; repeating the import created none and skipped all 12. Exact source CSV and normalized import data were saved privately outside the repository with owner-only permissions for migration parity. No shared preview/production database import was performed during this QA.

## Preview migration record — 17 September 2026

The additive schema migration was applied to the MASCA Website database through
the Supabase connector and registered as `20260917_124307_careers_cms` in Payload
migration history. All six Careers tables have RLS and deny direct anon/authenticated
database access. With Vercel credentials masked, the reviewed import was applied
through one atomic SQL operation, creating 12 roles (7 published, 5 drafts), their
study levels and 12 baseline history entries. The SQL was verified locally, including
an idempotent second execution. Private source data and notes were not committed.
The normal Payload import script remains available for future approved migrations.
