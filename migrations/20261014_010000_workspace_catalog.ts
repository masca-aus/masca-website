import {sql,type MigrateUpArgs} from '@payloadcms/db-postgres';
import {workspaceSchema} from '../features/access/workspaceEnvironment.ts';
import {calendarSchema} from '../features/mediaCalendar/schema.ts';
import {workspaceCatalogSchemaSQL} from '../features/access/workspaces/schema.ts';
export async function up({db}:MigrateUpArgs){const schema=workspaceSchema();if(process.env.VERCEL_ENV==='preview'&&schema==='public')throw Error('Workspace previews require isolated account data.');await db.execute(sql.raw(workspaceCatalogSchemaSQL(schema,calendarSchema())))}
export async function down(){throw Error('Retain workspace-aware enforcement, catalogue, grants and history. Fixed-scope rollback is unsupported after project ownership. Use a compatible build.');}
