import pg from "pg";
import { committeeAccessSchemaSQL } from "../features/access/committeeSchema.ts";
import { workspaceSchema } from "../features/access/workspaceEnvironment.ts";
import { calendarSchema } from "../features/mediaCalendar/schema.ts";
if (process.env.COMMITTEE_ACCESS_ENABLED !== "true")
  throw new Error("Committee activation must be explicitly enabled.");
const db = new pg.Client({ connectionString: process.env.DATABASE_URI });
await db.connect();
try {
  await db.query("BEGIN");
  await db.query(
    committeeAccessSchemaSQL(workspaceSchema(), calendarSchema(), true),
  );
  await db.query("COMMIT");
  console.log(
    "Committee drafts prepared from current content; existing drafts preserved.",
  );
} catch (error) {
  await db.query("ROLLBACK");
  throw error;
} finally {
  await db.end();
}
