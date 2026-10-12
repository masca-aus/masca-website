import pg from "pg";
import { calendarSchemaSQL } from "../features/mediaCalendar/schema.ts";
import { submissionSchemaSQL } from "../features/submissions/schema.ts";
import { reviewSchemaSQL } from "../features/submissions/reviewSchema.ts";
import { listingEmailSchemaSQL } from "../features/submissions/emailSchema.ts";
import { changeRequestSchemaSQL } from "../features/submissions/changeRequestSchema.ts";
const previewSchema = process.env.WORKSPACE_PREVIEW_SCHEMA;
if (
  process.env.VERCEL_ENV === "production" ||
  process.env.MEDIA_CALENDAR_ENABLED !== "true" ||
  process.env.WORKSPACE_AUTH_ENABLED !== "true" ||
  (previewSchema !== "cms_calendar_preview" &&
    previewSchema !== "cms_auth_preview") ||
  (process.env.CALENDAR_PREVIEW_TESTS === "true" &&
    previewSchema !== "cms_calendar_preview")
)
  throw new Error("Calendar requires an isolated Workspace preview schema.");
process.env.WORKSPACE_BOOTSTRAP_EMAIL ||= "admin@masca.org.au";
const c = new pg.Client({ connectionString: process.env.DATABASE_URI });
await c.connect();
await c.query(`CREATE SCHEMA IF NOT EXISTS "${previewSchema}"`);
const exists = await c.query(
  "SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name='users'",
  [previewSchema],
);
await c.query(calendarSchemaSQL("media_calendar_preview"));
if (exists.rows.length)
  await c.query(
    `ALTER TABLE "${previewSchema}".users ADD COLUMN IF NOT EXISTS calendar_access jsonb`,
  );
// The original Workspace preview predates committee drafts. Upgrade only this
// closed-set preview schema, preserving existing profiles as published.
const committeeStatus = await c.query(
  "SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name='committee' AND column_name='_status'",
  [previewSchema],
);
if (exists.rows.length && !committeeStatus.rows.length) {
  await c.query(`
    BEGIN;
    DO $$ BEGIN CREATE TYPE "${previewSchema}".enum_committee_status AS ENUM ('draft','published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "${previewSchema}".enum__committee_v_version_status AS ENUM ('draft','published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    ALTER TABLE "${previewSchema}".committee
      ALTER COLUMN name DROP NOT NULL, ALTER COLUMN role DROP NOT NULL,
      ALTER COLUMN department DROP NOT NULL, ALTER COLUMN year DROP NOT NULL,
      ALTER COLUMN portrait_id DROP NOT NULL,
      ADD COLUMN _status "${previewSchema}".enum_committee_status DEFAULT 'draft';
    UPDATE "${previewSchema}".committee SET _status='published';
    ALTER TABLE "${previewSchema}"._committee_v
      ALTER COLUMN version_name DROP NOT NULL, ALTER COLUMN version_role DROP NOT NULL,
      ALTER COLUMN version_department DROP NOT NULL, ALTER COLUMN version_year DROP NOT NULL,
      ALTER COLUMN version_portrait_id DROP NOT NULL,
      ADD COLUMN version__status "${previewSchema}".enum__committee_v_version_status DEFAULT 'draft',
      ADD COLUMN latest boolean;
    CREATE INDEX IF NOT EXISTS committee__status_idx ON "${previewSchema}".committee(_status);
    CREATE INDEX IF NOT EXISTS _committee_v_version_version__status_idx ON "${previewSchema}"._committee_v(version__status);
    CREATE INDEX IF NOT EXISTS _committee_v_latest_idx ON "${previewSchema}"._committee_v(latest);
    COMMIT;
  `);
}
await c.end();
process.env.WORKSPACE_INIT_SCHEMA = exists.rows.length ? "false" : "true";
Object.assign(process.env, { NODE_ENV: "development" });
const { getPayload } = await import("payload"),
  { default: config } = await import("../payload.config.ts");
const payload = await getPayload({ config });
if (payload.db.schemaName !== previewSchema)
  throw new Error("Wrong database schema.");
// Preserve the existing recovery account identity in this isolated preview.
// No live user records or calendar approval memberships are copied.
if (process.env.CALENDAR_PREVIEW_TESTS !== "true") {
  const existing = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
  });
  if (!existing.totalDocs)
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        email: process.env.WORKSPACE_BOOTSTRAP_EMAIL,
        role: "administrator",
        status: "active",
        grants: [],
      } as never,
    });
}
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
  await connection.query(schema(previewSchema));
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
