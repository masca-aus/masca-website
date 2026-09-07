import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_committee_department" AS ENUM('chairs', 'secretariat', 'treasury', 'amplifies', 'careers', 'cares', 'unites', 'unassigned');
  ALTER TABLE "committee" ADD COLUMN "department" "enum_committee_department" DEFAULT 'unassigned' NOT NULL;

  -- Preserve every existing record and classify only roles whose department
  -- can be inferred confidently. More specific departments run before the
  -- generic chair match (for example, "Careers Vice-Chairperson"). Anything
  -- unfamiliar stays in the explicit review bucket instead of being guessed.
  UPDATE "committee"
  SET "department" = CASE
    WHEN lower("role") LIKE '%secretar%' THEN 'secretariat'::"enum_committee_department"
    WHEN lower("role") ~ '(treasury|treasurer)' THEN 'treasury'::"enum_committee_department"
    WHEN lower("role") ~ '(media|digital|amplif)' THEN 'amplifies'::"enum_committee_department"
    WHEN lower("role") LIKE '%career%' THEN 'careers'::"enum_committee_department"
    WHEN lower("role") LIKE '%cares%' THEN 'cares'::"enum_committee_department"
    WHEN lower("role") LIKE '%unite%' THEN 'unites'::"enum_committee_department"
    WHEN lower("role") ~ '(chair|president)' THEN 'chairs'::"enum_committee_department"
    ELSE 'unassigned'::"enum_committee_department"
  END;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "committee" DROP COLUMN "department";
  DROP TYPE "public"."enum_committee_department";`)
}
