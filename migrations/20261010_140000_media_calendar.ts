import {
  type MigrateUpArgs,
  type MigrateDownArgs,
  sql,
} from "@payloadcms/db-postgres";
import { workspaceSchema } from "../features/access/workspaceEnvironment.ts";
import {
  calendarSchemaSQL,
  calendarSchema,
} from "../features/mediaCalendar/schema.ts";
export async function up({ db }: MigrateUpArgs) {
  await db.execute(
    sql.raw(
      `ALTER TABLE "${workspaceSchema()}".users ADD COLUMN IF NOT EXISTS calendar_access jsonb; ${calendarSchemaSQL()}`,
    ),
  );
}
export async function down({ db }: MigrateDownArgs) {
  await db.execute(
    sql.raw(
      `DROP SCHEMA IF EXISTS "${calendarSchema()}" CASCADE; ALTER TABLE "${workspaceSchema()}".users DROP COLUMN IF EXISTS calendar_access;`,
    ),
  );
}
