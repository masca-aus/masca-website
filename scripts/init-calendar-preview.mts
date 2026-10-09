import pg from "pg";
import { calendarSchemaSQL } from "../features/mediaCalendar/schema.ts";
import { submissionSchemaSQL } from "../features/submissions/schema.ts";
import { reviewSchemaSQL } from "../features/submissions/reviewSchema.ts";
import { listingEmailSchemaSQL } from "../features/submissions/emailSchema.ts";
import { changeRequestSchemaSQL } from "../features/submissions/changeRequestSchema.ts";
if (
  process.env.VERCEL_ENV === "production" ||
  process.env.MEDIA_CALENDAR_ENABLED !== "true" ||
  process.env.WORKSPACE_AUTH_ENABLED !== "true" ||
  process.env.WORKSPACE_PREVIEW_SCHEMA !== "cms_calendar_preview"
)
  throw new Error("Dedicated calendar preview only.");
process.env.WORKSPACE_BOOTSTRAP_EMAIL ||= "admin@masca.org.au";
const c = new pg.Client({ connectionString: process.env.DATABASE_URI });
await c.connect();
await c.query("CREATE SCHEMA IF NOT EXISTS cms_calendar_preview");
const exists = await c.query(
  "SELECT 1 FROM information_schema.tables WHERE table_schema='cms_calendar_preview' AND table_name='users'",
);
await c.query(calendarSchemaSQL("media_calendar_preview"));
if (exists.rows.length)
  await c.query(
    "ALTER TABLE cms_calendar_preview.users ADD COLUMN IF NOT EXISTS calendar_access jsonb",
  );
await c.end();
process.env.WORKSPACE_INIT_SCHEMA = exists.rows.length ? "false" : "true";
Object.assign(process.env, { NODE_ENV: "development" });
const { getPayload } = await import("payload"),
  { default: config } = await import("../payload.config.ts");
const payload = await getPayload({ config });
if (payload.db.schemaName !== "cms_calendar_preview")
  throw new Error("Wrong database schema.");
const connection = new pg.Client({
  connectionString: process.env.DATABASE_URI,
});
await connection.connect();
for (const schema of [
  submissionSchemaSQL,
  reviewSchemaSQL,
  listingEmailSchemaSQL,
  changeRequestSchemaSQL,
])
  await connection.query(schema("cms_calendar_preview"));
// Preview-only QA accounts cannot authenticate against production or other preview schemas.
if (process.env.CALENDAR_PREVIEW_TESTS === "true") {
  for (const [email, id, role] of [
    ["calendar-author@masca.org.au", 900001, "administrator"],
    ["calendar-reviewer@masca.org.au", 900002, "editor"],
  ] as const) {
    const found = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });
    if (!found.totalDocs)
      await payload.create({
        collection: "users",
        overrideAccess: true,
        context: { workspaceLogin: true },
        data: {
          email,
          id,
          status: "active",
          role,
          sessionRevision: "calendar-preview-qa-v1",
          grants: [],
          calendarAccess: {
            view: true,
            edit: true,
            approve: true,
            designation: "member",
          },
        } as never,
      });
  }
}
console.log("Dedicated calendar preview schema and private records ready.");
await connection.end();
await payload.destroy();
process.exit(0);
