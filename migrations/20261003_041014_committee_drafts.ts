import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_committee_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__committee_v_version_status" AS ENUM('draft', 'published');
  ALTER TABLE "committee" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "role" DROP NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "department" DROP NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "year" DROP NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "portrait_id" DROP NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_name" DROP NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_role" DROP NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_department" DROP NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_year" DROP NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_portrait_id" DROP NOT NULL;
  ALTER TABLE "committee" ADD COLUMN "_status" "enum_committee_status" DEFAULT 'draft';
  UPDATE "committee" SET "_status" = 'published';
  ALTER TABLE "_committee_v" ADD COLUMN "version__status" "enum__committee_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_committee_v" ADD COLUMN "latest" boolean;
  CREATE INDEX "committee__status_idx" ON "committee" USING btree ("_status");
  CREATE INDEX "_committee_v_version_version__status_idx" ON "_committee_v" USING btree ("version__status");
  CREATE INDEX "_committee_v_latest_idx" ON "_committee_v" USING btree ("latest");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "committee__status_idx";
  DROP INDEX "_committee_v_version_version__status_idx";
  DROP INDEX "_committee_v_latest_idx";
  ALTER TABLE "committee" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "role" SET NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "department" SET NOT NULL;
  ALTER TABLE "committee" ALTER COLUMN "year" SET NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_name" SET NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_role" SET NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_department" SET NOT NULL;
  ALTER TABLE "_committee_v" ALTER COLUMN "version_year" SET NOT NULL;
  ALTER TABLE "committee" DROP COLUMN "_status";
  ALTER TABLE "_committee_v" DROP COLUMN "version__status";
  ALTER TABLE "_committee_v" DROP COLUMN "latest";
  DROP TYPE "public"."enum_committee_status";
  DROP TYPE "public"."enum__committee_v_version_status";`)
}
