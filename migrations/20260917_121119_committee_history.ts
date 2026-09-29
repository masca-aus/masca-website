import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum__committee_v_version_department" AS ENUM('chairs', 'secretariat', 'treasury', 'amplifies', 'careers', 'cares', 'unites', 'unassigned');
  CREATE TABLE "_committee_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_name" varchar NOT NULL,
  	"version_university" varchar,
  	"version_course" varchar,
  	"version_role" varchar NOT NULL,
  	"version_department" "enum__committee_v_version_department" DEFAULT 'unassigned' NOT NULL,
  	"version_year" varchar NOT NULL,
  	"version_portrait_id" integer NOT NULL,
  	"version_bio" varchar,
  	"version_linkedin_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "_committee_v" ADD CONSTRAINT "_committee_v_parent_id_committee_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."committee"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_committee_v" ADD CONSTRAINT "_committee_v_version_portrait_id_media_id_fk" FOREIGN KEY ("version_portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_committee_v_parent_idx" ON "_committee_v" USING btree ("parent_id");
  CREATE INDEX "_committee_v_version_version__order_idx" ON "_committee_v" USING btree ("version__order");
  CREATE INDEX "_committee_v_version_version_portrait_idx" ON "_committee_v" USING btree ("version_portrait_id");
  CREATE INDEX "_committee_v_version_version_updated_at_idx" ON "_committee_v" USING btree ("version_updated_at");
  CREATE INDEX "_committee_v_version_version_created_at_idx" ON "_committee_v" USING btree ("version_created_at");
  CREATE INDEX "_committee_v_created_at_idx" ON "_committee_v" USING btree ("created_at");
  CREATE INDEX "_committee_v_updated_at_idx" ON "_committee_v" USING btree ("updated_at");
  ALTER TABLE "_committee_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "_committee_v" FROM anon, authenticated;
  INSERT INTO "_committee_v" ("parent_id", "version__order", "version_name", "version_university", "version_course", "version_role", "version_department", "version_year", "version_portrait_id", "version_bio", "version_linkedin_url", "version_updated_at", "version_created_at")
  SELECT "id", "_order", "name", "university", "course", "role", "department"::text::"enum__committee_v_version_department", "year", "portrait_id", "bio", "linkedin_url", "updated_at", "created_at" FROM "committee";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_committee_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_committee_v" CASCADE;
  DROP TYPE "public"."enum__committee_v_version_department";`)
}
