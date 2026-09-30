import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';
import { submissionSchemaSQL } from '../features/submissions/schema.ts';
export async function up({db}:MigrateUpArgs):Promise<void> {await db.execute(sql.raw(submissionSchemaSQL('public')));}
export async function down({db}:MigrateDownArgs):Promise<void> {
 await db.execute(sql`ALTER TABLE public.events DROP COLUMN IF EXISTS submitted_for_review;
 ALTER TABLE public._events_v DROP COLUMN IF EXISTS version_submitted_for_review;
 ALTER TABLE public.careers DROP COLUMN IF EXISTS submitted_for_review, DROP COLUMN IF EXISTS contact_name, DROP COLUMN IF EXISTS contact_email;
 ALTER TABLE public._careers_v DROP COLUMN IF EXISTS version_submitted_for_review, DROP COLUMN IF EXISTS version_contact_name, DROP COLUMN IF EXISTS version_contact_email;`);
}
