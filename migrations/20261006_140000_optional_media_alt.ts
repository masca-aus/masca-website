import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;`);
}

export async function down({ db }: MigrateDownArgs) {
  await db.execute(sql`UPDATE "media" SET "alt" = '' WHERE "alt" IS NULL;
    ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;`);
}
