import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { generateNKeysBetween } from 'payload/shared'

// The committee collection is now `orderable: true` (drag-and-drop in the
// admin list) instead of carrying a manual `order` number, and gained
// optional `university`/`course` fields while `bio` became optional.
//
// NOTE: migrate:create generated this file as a full CREATE-everything
// migration because the original migration chain was deleted from the repo
// after being applied to production. The accompanying .json snapshot keeps
// the full current schema (so future migrations diff correctly), but the
// statements below are hand-trimmed to the actual delta against the
// deployed database.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "committee" ADD COLUMN "_order" varchar;
  ALTER TABLE "committee" ADD COLUMN "university" varchar;
  ALTER TABLE "committee" ADD COLUMN "course" varchar;
  ALTER TABLE "committee" ALTER COLUMN "bio" DROP NOT NULL;
  CREATE INDEX "committee__order_idx" ON "committee" USING btree ("_order");`)

  // Backfill `_order` so the current display order survives the switch.
  // Rows are keyed with Payload's own fractional-indexing scheme (the same
  // one the drag UI writes), walking the old `order` numbers ascending.
  // Interleaving across years doesn't matter — the site filters per year,
  // so only per-year relative order is observable.
  const { rows } = (await db.execute(
    sql`SELECT "id" FROM "committee" ORDER BY "order" ASC, "id" ASC`,
  )) as unknown as { rows: { id: number }[] }
  const keys = generateNKeysBetween(null, null, rows.length)
  for (const [i, row] of rows.entries()) {
    await db.execute(
      sql`UPDATE "committee" SET "_order" = ${keys[i]} WHERE "id" = ${row.id}`,
    )
  }

  await db.execute(sql`
   ALTER TABLE "committee" DROP COLUMN "order";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Rebuild the numeric `order` from the drag order, densely renumbered from 1.
  await db.execute(sql`
   ALTER TABLE "committee" ADD COLUMN "order" numeric;
  UPDATE "committee" SET "order" = ranked.rn
    FROM (SELECT "id", row_number() OVER (ORDER BY "_order" ASC, "id" ASC) AS rn FROM "committee") ranked
    WHERE "committee"."id" = ranked."id";
  ALTER TABLE "committee" ALTER COLUMN "order" SET NOT NULL;
  UPDATE "committee" SET "bio" = '' WHERE "bio" IS NULL;
  ALTER TABLE "committee" ALTER COLUMN "bio" SET NOT NULL;
  DROP INDEX "committee__order_idx";
  ALTER TABLE "committee" DROP COLUMN "_order";
  ALTER TABLE "committee" DROP COLUMN "university";
  ALTER TABLE "committee" DROP COLUMN "course";`)
}
