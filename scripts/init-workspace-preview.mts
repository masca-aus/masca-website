// One-time initialization of the isolated authentication preview only.
import pg from "pg";
import { submissionSchemaSQL } from "../features/submissions/schema.ts";
if (
  process.env.WORKSPACE_AUTH_ENABLED !== "true" ||
  process.env.VERCEL_ENV === "production"
)
  throw new Error("Preview only");
const connection = new pg.Client({
  connectionString: process.env.DATABASE_URI,
});
await connection.connect();
await connection.query("CREATE SCHEMA IF NOT EXISTS cms_auth_preview");
const tables = await connection.query(
  "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='cms_auth_preview'",
);
if (tables.rows[0].count > 0)
  await connection.query(
    "ALTER TABLE cms_auth_preview.users ADD COLUMN IF NOT EXISTS all_content_access boolean DEFAULT false, ADD COLUMN IF NOT EXISTS permissions jsonb",
  );
if (tables.rows[0].count > 0) await connection.query(submissionSchemaSQL("cms_auth_preview"));
await connection.end();
process.env.WORKSPACE_INIT_SCHEMA =
  tables.rows[0].count === 0 ? "true" : "false";
Object.assign(process.env, { NODE_ENV: "development" });

const { getPayload } = await import("payload");
const { default: config } = await import("../payload.config.ts");
const payload = await getPayload({ config });
if (payload.db.schemaName !== "cms_auth_preview")
  throw new Error("Wrong schema");
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
      email: "admin@masca.org.au",
      role: "administrator",
      status: "active",
      grants: [],
    } as never,
  });
console.log("Isolated preview schema and initial administrator are ready.");
const { verifyWorkspacePreview } =
  await import("./verify-workspace-preview.mts");
await verifyWorkspacePreview(payload);
const { verifyPublicSubmissions } = await import("./verify-public-submissions.mts");
await verifyPublicSubmissions(payload);
await payload.destroy();
// Payload's adapter destroy resets its schema but leaves pool handles alive.
// All verification and cleanup has completed; finish this one-shot build step.
process.exit(0);
