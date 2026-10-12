import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_care_pathways_entry_type" AS ENUM ('parent', 'child');
    ALTER TABLE "care_pathways" ADD COLUMN "entry_type" "public"."enum_care_pathways_entry_type";
    UPDATE "care_pathways"
      SET "entry_type" = CASE WHEN "parent_id" IS NULL THEN 'parent'::"public"."enum_care_pathways_entry_type" ELSE 'child'::"public"."enum_care_pathways_entry_type" END;
    ALTER TABLE "care_pathways" ALTER COLUMN "entry_type" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "care_pathways" DROP COLUMN "entry_type";
    DROP TYPE "public"."enum_care_pathways_entry_type";
  `)
}
