import { sql, type MigrateUpArgs } from "@payloadcms/db-postgres";
import { workspaceSchema } from "../features/access/workspaceEnvironment.ts";
import { accountPhotoSchemaSQL } from "../features/account/photoSchema.ts";
export async function up({ db }: MigrateUpArgs) {
  const schema = workspaceSchema();
  if (process.env.VERCEL_ENV === "preview" && schema === "public")
    throw new Error("Account photo previews require isolated account data.");
  await db.execute(sql.raw(accountPhotoSchemaSQL(schema)));
}
export async function down() {
  throw new Error("Roll back the application while preserving account photos.");
}
