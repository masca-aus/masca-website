import {type MigrateUpArgs,type MigrateDownArgs,sql} from '@payloadcms/db-postgres';
import {workspaceSchema} from '../features/access/workspaceEnvironment.ts';
import {changeRequestSchemaSQL} from '../features/submissions/changeRequestSchema.ts';
export async function up({db}:MigrateUpArgs){await db.execute(sql.raw(changeRequestSchemaSQL(workspaceSchema())));}
export async function down({db}:MigrateDownArgs){await db.execute(sql.raw(`DROP TABLE IF EXISTS "${workspaceSchema()}"."listing_change_requests";`));}
