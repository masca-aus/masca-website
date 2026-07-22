import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "committee" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" varchar NOT NULL,
  	"portrait_id" integer NOT NULL,
  	"year" varchar NOT NULL,
  	"order" numeric NOT NULL,
  	"linkedin_url" varchar,
  	"bio" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "committee_id" integer;
  ALTER TABLE "committee" ADD CONSTRAINT "committee_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "committee_portrait_idx" ON "committee" USING btree ("portrait_id");
  CREATE INDEX "committee_updated_at_idx" ON "committee" USING btree ("updated_at");
  CREATE INDEX "committee_created_at_idx" ON "committee" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_committee_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committee"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_committee_id_idx" ON "payload_locked_documents_rels" USING btree ("committee_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "committee" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "committee" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_committee_fk";
  
  DROP INDEX "payload_locked_documents_rels_committee_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "committee_id";`)
}
