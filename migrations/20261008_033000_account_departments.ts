import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres';
import { departmentSchemaSQL } from '../features/dashboard/departmentSchema.ts';
import {workspaceSchema} from '../features/access/workspaceEnvironment.ts';
/** Public rollout requires database-owner review. Preview preparation uses its isolated schema. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const schema = workspaceSchema();
  if (process.env.VERCEL_ENV === 'preview' && schema === 'public')
    throw new Error('Dashboard previews require isolated account data and migration history.');
  await db.execute(sql.raw(departmentSchemaSQL(schema)));
}
export async function down(): Promise<void> {
  throw new Error('Roll back application code while preserving account department assignments.');
}
