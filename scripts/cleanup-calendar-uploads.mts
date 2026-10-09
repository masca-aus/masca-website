/** Explicit maintenance job. Never deletes a ready asset or an object referenced by a duplicate. */
import pg from "pg";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { calendarSchema } from "../features/mediaCalendar/schema.ts";
import { privateStorage } from "../features/mediaCalendar/assets.ts";
if (process.env.MEDIA_CALENDAR_ENABLED !== "true")
  throw new Error("Calendar is not enabled.");
const c = new pg.Client({ connectionString: process.env.DATABASE_URI });
await c.connect();
const schema = calendarSchema(),
  table = `"${schema}".assets`;
const expired = await c.query(
  `SELECT id,data FROM ${table} WHERE (data->>'ready'='false' OR data->>'stagingKey' IS NOT NULL) AND (data->>'createdAt')::timestamptz<now()-interval '24 hours' LIMIT 100`,
);
const { s3, bucket } = privateStorage();
let cleaned = 0;
for (const row of expired.rows) {
  await c.query("BEGIN");
  try {
    const current = await c.query(
      `SELECT data FROM ${table} WHERE id=$1 FOR UPDATE`,
      [row.id],
    );
    if (!current.rows.length) {
      await c.query("ROLLBACK");
      continue;
    }
    const asset = current.rows[0].data;
    if (asset.ready) {
      if (!asset.stagingKey || asset.stagingKey === asset.key) {
        await c.query("ROLLBACK");
        continue;
      }
      const stagedReferences = await c.query(
        `SELECT id FROM ${table} WHERE data->>'key'=$1 LIMIT 1`,
        [asset.stagingKey],
      );
      if (stagedReferences.rows.length) {
        await c.query("ROLLBACK");
        continue;
      }
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: asset.stagingKey }),
      );
      await c.query(`UPDATE ${table} SET data=data-'stagingKey' WHERE id=$1`, [
        row.id,
      ]);
      await c.query("COMMIT");
      cleaned++;
      continue;
    }
    const refs = await c.query(
      `SELECT id FROM ${table} WHERE id<>$1 AND data->>'key'=$2 LIMIT 1`,
      [row.id, row.data.key],
    );
    if (refs.rows.length) {
      await c.query("ROLLBACK");
      continue;
    }
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: row.data.key }),
    );
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: `${row.data.key}/preview.webp`,
      }),
    );
    await c.query(`DELETE FROM ${table} WHERE id=$1`, [row.id]);
    await c.query("COMMIT");
    cleaned++;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  }
}
await c.end();
console.log(`Removed ${cleaned} expired incomplete calendar uploads.`);
