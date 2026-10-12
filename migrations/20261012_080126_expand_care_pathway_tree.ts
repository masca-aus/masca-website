import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "care_pathways" ADD COLUMN "parent_id" integer;
  ALTER TABLE "care_pathways" ADD COLUMN "detail" varchar;
  ALTER TABLE "care_pathways" ADD COLUMN "link_url" varchar;
  INSERT INTO "care_pathways" ("title", "short_description", "sort_order", "parent_id", "link_url")
  SELECT subsection."title", subsection."detail", subsection."_order" + 1, subsection."_parent_id", subsection."link_url"
  FROM "care_pathways_subsections" AS subsection
  ORDER BY subsection."_parent_id", subsection."_order";
  ALTER TABLE "care_pathways_subsections" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "care_pathways_subsections" CASCADE;
  DROP INDEX "care_pathways_category_idx";
  ALTER TABLE "care_pathways" ADD CONSTRAINT "care_pathways_parent_id_care_pathways_id_fk" FOREIGN KEY ("parent_id") REFERENCES "care_pathways"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "care_pathways_parent_idx" ON "care_pathways" USING btree ("parent_id");
  ALTER TABLE "care_pathways" DROP COLUMN "category";
  DROP TYPE "enum_care_pathways_category";`)
}

export async function down(): Promise<void> {
  throw new Error("Care pathway records are now hierarchical content. Roll forward instead of flattening or deleting it.");
}
