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
  if (calendarSchema() === "media_calendar_preview" && workspaceSchema() === "public")
    throw new Error("Calendar previews require isolated CMS users and migration history.");
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
