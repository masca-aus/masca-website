import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "care_pathways_subsections" (
      "id" varchar PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "short_description" varchar,
      "detail" varchar,
      "image_id" integer
    );
    CREATE TABLE "care_pathways_subsections_links" (
      "id" varchar PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "label" varchar NOT NULL,
      "url" varchar NOT NULL
    );
    ALTER TABLE "care_pathways_subsections"
      ADD CONSTRAINT "care_pathways_subsections_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "care_pathways"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "care_pathways_subsections"
      ADD CONSTRAINT "care_pathways_subsections_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "care_pathways_subsections_links"
      ADD CONSTRAINT "care_pathways_subsections_links_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "care_pathways_subsections"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "care_pathways_subsections_order_idx" ON "care_pathways_subsections" USING btree ("_order");
    CREATE INDEX "care_pathways_subsections_parent_idx" ON "care_pathways_subsections" USING btree ("_parent_id");
    CREATE INDEX "care_pathways_subsections_image_idx" ON "care_pathways_subsections" USING btree ("image_id");
    CREATE INDEX "care_pathways_subsections_links_order_idx" ON "care_pathways_subsections_links" USING btree ("_order");
    CREATE INDEX "care_pathways_subsections_links_parent_idx" ON "care_pathways_subsections_links" USING btree ("_parent_id");
    ALTER TABLE "care_pathways_subsections" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "care_pathways_subsections_links" ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE "care_pathways_subsections", "care_pathways_subsections_links" FROM anon, authenticated;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "care_pathways_subsections_links";
    DROP TABLE "care_pathways_subsections";
  `)
}
