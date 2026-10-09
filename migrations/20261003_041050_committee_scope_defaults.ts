import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The workspace schema requires ownership even when workspace auth is disabled.
// National is the default for committee profiles created through that CMS mode.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."committee" ALTER COLUMN "owning_scope" SET DEFAULT 'National';
    ALTER TABLE "public"."_committee_v" ALTER COLUMN "version_owning_scope" SET DEFAULT 'National';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."committee" ALTER COLUMN "owning_scope" DROP DEFAULT;
    ALTER TABLE "public"."_committee_v" ALTER COLUMN "version_owning_scope" DROP DEFAULT;
  `)
}
