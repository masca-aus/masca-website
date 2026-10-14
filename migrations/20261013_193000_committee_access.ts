import { sql, type MigrateUpArgs } from "@payloadcms/db-postgres";
import { workspaceSchema } from "../features/access/workspaceEnvironment.ts";
import { calendarSchema } from "../features/mediaCalendar/schema.ts";
import { committeeAccessSchemaSQL } from "../features/access/committeeSchema.ts";
export async function up({ db }: MigrateUpArgs) {
  const schema = workspaceSchema();
  if (process.env.VERCEL_ENV === "preview" && schema === "public")
    throw new Error("Committee previews require isolated account data.");
  await db.execute(sql.raw(committeeAccessSchemaSQL(schema, calendarSchema())));
}
export async function down() {
  throw new Error(
    "Retain workspace-aware ownership enforcement on rollback; preserve memberships and audit history. Use a compatible build.",
  );
}
