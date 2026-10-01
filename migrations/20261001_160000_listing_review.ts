import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';
import { reviewSchemaSQL } from '../features/submissions/reviewSchema.ts';
export async function up({db}:MigrateUpArgs) { await db.execute(sql.raw(reviewSchemaSQL('public'))); }
export async function down({db}:MigrateDownArgs) { for(const table of ['events','careers']) { await db.execute(sql.raw(`ALTER TABLE public.${table} DROP COLUMN IF EXISTS needs_changes, DROP COLUMN IF EXISTS review_notes; ALTER TABLE public._${table}_v DROP COLUMN IF EXISTS version_needs_changes, DROP COLUMN IF EXISTS version_review_notes;`)); } }
