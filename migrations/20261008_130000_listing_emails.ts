import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';
import { workspaceSchema } from '../features/access/workspaceEnvironment.ts';
import { listingEmailSchemaSQL } from '../features/submissions/emailSchema.ts';
export async function up({db}:MigrateUpArgs){await db.execute(sql.raw(listingEmailSchemaSQL(workspaceSchema())));}
export async function down({db}:MigrateDownArgs){for(const table of ['events','careers']) await db.execute(sql.raw(`ALTER TABLE "${workspaceSchema()}"."${table}" DROP COLUMN IF EXISTS submission_received_at; ALTER TABLE "${workspaceSchema()}"."_${table}_v" DROP COLUMN IF EXISTS version_submission_received_at;`));await db.execute(sql.raw(`DROP TABLE IF EXISTS "${workspaceSchema()}"."listing_emails";`));}
