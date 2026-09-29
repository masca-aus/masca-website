import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_careers_study_levels" AS ENUM('any', 'pre-penultimate', 'penultimate', 'final', 'graduate', 'postgraduate');
  CREATE TYPE "public"."enum_careers_type" AS ENUM('internship', 'cadet', 'graduate', 'vacation', 'part-time', 'casual', 'full-time', 'volunteer', 'other');
  CREATE TYPE "public"."enum_careers_work_mode" AS ENUM('onsite', 'hybrid', 'remote');
  CREATE TYPE "public"."enum_careers_international" AS ENUM('yes', 'no', 'unsure');
  CREATE TYPE "public"."enum_careers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__careers_v_version_study_levels" AS ENUM('any', 'pre-penultimate', 'penultimate', 'final', 'graduate', 'postgraduate');
  CREATE TYPE "public"."enum__careers_v_version_type" AS ENUM('internship', 'cadet', 'graduate', 'vacation', 'part-time', 'casual', 'full-time', 'volunteer', 'other');
  CREATE TYPE "public"."enum__careers_v_version_work_mode" AS ENUM('onsite', 'hybrid', 'remote');
  CREATE TYPE "public"."enum__careers_v_version_international" AS ENUM('yes', 'no', 'unsure');
  CREATE TYPE "public"."enum__careers_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "careers_study_levels" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_careers_study_levels",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "careers" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "company" varchar,
    "type" "enum_careers_type" DEFAULT 'internship',
    "industry" varchar,
    "company_website" varchar,
    "logo_url" varchar,
    "country" varchar DEFAULT 'Australia',
    "state" varchar,
    "city" varchar,
    "work_mode" "enum_careers_work_mode",
    "international" "enum_careers_international" DEFAULT 'unsure',
    "eligibility" varchar,
    "apply_url" varchar,
    "closes" varchar,
    "added" varchar,
    "pay" varchar,
    "description" varchar,
    "tags" varchar,
    "featured" boolean DEFAULT false,
    "slug" varchar,
    "internal_notes" varchar,
    "source_key" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_careers_status" DEFAULT 'draft'
  );

  CREATE TABLE "_careers_v_version_study_levels" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum__careers_v_version_study_levels",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "_careers_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_company" varchar,
    "version_type" "enum__careers_v_version_type" DEFAULT 'internship',
    "version_industry" varchar,
    "version_company_website" varchar,
    "version_logo_url" varchar,
    "version_country" varchar DEFAULT 'Australia',
    "version_state" varchar,
    "version_city" varchar,
    "version_work_mode" "enum__careers_v_version_work_mode",
    "version_international" "enum__careers_v_version_international" DEFAULT 'unsure',
    "version_eligibility" varchar,
    "version_apply_url" varchar,
    "version_closes" varchar,
    "version_added" varchar,
    "version_pay" varchar,
    "version_description" varchar,
    "version_tags" varchar,
    "version_featured" boolean DEFAULT false,
    "version_slug" varchar,
    "version_internal_notes" varchar,
    "version_source_key" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__careers_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "career_lifecycle" (
    "id" serial PRIMARY KEY NOT NULL,
    "career_id" integer NOT NULL,
    "status" varchar NOT NULL,
    "closed_at" timestamp(3) with time zone,
    "archived_at" timestamp(3) with time zone,
    "changed_by_id" integer NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "_career_lifecycle_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_career_id" integer NOT NULL,
    "version_status" varchar NOT NULL,
    "version_closed_at" timestamp(3) with time zone,
    "version_archived_at" timestamp(3) with time zone,
    "version_changed_by_id" integer NOT NULL,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "careers_id" integer;
  ALTER TABLE "careers_study_levels" ADD CONSTRAINT "careers_study_levels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_careers_v_version_study_levels" ADD CONSTRAINT "_careers_v_version_study_levels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_careers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_careers_v" ADD CONSTRAINT "_careers_v_parent_id_careers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."careers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "career_lifecycle" ADD CONSTRAINT "career_lifecycle_career_id_careers_id_fk" FOREIGN KEY ("career_id") REFERENCES "public"."careers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "career_lifecycle" ADD CONSTRAINT "career_lifecycle_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_career_lifecycle_v" ADD CONSTRAINT "_career_lifecycle_v_parent_id_career_lifecycle_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."career_lifecycle"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_career_lifecycle_v" ADD CONSTRAINT "_career_lifecycle_v_version_career_id_careers_id_fk" FOREIGN KEY ("version_career_id") REFERENCES "public"."careers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_career_lifecycle_v" ADD CONSTRAINT "_career_lifecycle_v_version_changed_by_id_users_id_fk" FOREIGN KEY ("version_changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "careers_study_levels_order_idx" ON "careers_study_levels" USING btree ("order");
  CREATE INDEX "careers_study_levels_parent_idx" ON "careers_study_levels" USING btree ("parent_id");
  CREATE UNIQUE INDEX "careers_slug_idx" ON "careers" USING btree ("slug");
  CREATE UNIQUE INDEX "careers_source_key_idx" ON "careers" USING btree ("source_key");
  CREATE INDEX "careers_updated_at_idx" ON "careers" USING btree ("updated_at");
  CREATE INDEX "careers_created_at_idx" ON "careers" USING btree ("created_at");
  CREATE INDEX "careers__status_idx" ON "careers" USING btree ("_status");
  CREATE INDEX "_careers_v_version_study_levels_order_idx" ON "_careers_v_version_study_levels" USING btree ("order");
  CREATE INDEX "_careers_v_version_study_levels_parent_idx" ON "_careers_v_version_study_levels" USING btree ("parent_id");
  CREATE INDEX "_careers_v_parent_idx" ON "_careers_v" USING btree ("parent_id");
  CREATE INDEX "_careers_v_version_version_slug_idx" ON "_careers_v" USING btree ("version_slug");
  CREATE INDEX "_careers_v_version_version_source_key_idx" ON "_careers_v" USING btree ("version_source_key");
  CREATE INDEX "_careers_v_version_version_updated_at_idx" ON "_careers_v" USING btree ("version_updated_at");
  CREATE INDEX "_careers_v_version_version_created_at_idx" ON "_careers_v" USING btree ("version_created_at");
  CREATE INDEX "_careers_v_version_version__status_idx" ON "_careers_v" USING btree ("version__status");
  CREATE INDEX "_careers_v_created_at_idx" ON "_careers_v" USING btree ("created_at");
  CREATE INDEX "_careers_v_updated_at_idx" ON "_careers_v" USING btree ("updated_at");
  CREATE INDEX "_careers_v_latest_idx" ON "_careers_v" USING btree ("latest");
  CREATE UNIQUE INDEX "career_lifecycle_career_idx" ON "career_lifecycle" USING btree ("career_id");
  CREATE INDEX "career_lifecycle_changed_by_idx" ON "career_lifecycle" USING btree ("changed_by_id");
  CREATE INDEX "career_lifecycle_updated_at_idx" ON "career_lifecycle" USING btree ("updated_at");
  CREATE INDEX "career_lifecycle_created_at_idx" ON "career_lifecycle" USING btree ("created_at");
  CREATE INDEX "_career_lifecycle_v_parent_idx" ON "_career_lifecycle_v" USING btree ("parent_id");
  CREATE INDEX "_career_lifecycle_v_version_version_career_idx" ON "_career_lifecycle_v" USING btree ("version_career_id");
  CREATE INDEX "_career_lifecycle_v_version_version_changed_by_idx" ON "_career_lifecycle_v" USING btree ("version_changed_by_id");
  CREATE INDEX "_career_lifecycle_v_version_version_updated_at_idx" ON "_career_lifecycle_v" USING btree ("version_updated_at");
  CREATE INDEX "_career_lifecycle_v_version_version_created_at_idx" ON "_career_lifecycle_v" USING btree ("version_created_at");
  CREATE INDEX "_career_lifecycle_v_created_at_idx" ON "_career_lifecycle_v" USING btree ("created_at");
  CREATE INDEX "_career_lifecycle_v_updated_at_idx" ON "_career_lifecycle_v" USING btree ("updated_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_careers_fk" FOREIGN KEY ("careers_id") REFERENCES "public"."careers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_careers_id_idx" ON "payload_locked_documents_rels" USING btree ("careers_id");
  ALTER TABLE "careers" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "careers" FROM anon, authenticated;
  ALTER TABLE "careers_study_levels" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "careers_study_levels" FROM anon, authenticated;
  ALTER TABLE "_careers_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "_careers_v" FROM anon, authenticated;
  ALTER TABLE "_careers_v_version_study_levels" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "_careers_v_version_study_levels" FROM anon, authenticated;
  ALTER TABLE "career_lifecycle" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "career_lifecycle" FROM anon, authenticated;
  ALTER TABLE "_career_lifecycle_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "_career_lifecycle_v" FROM anon, authenticated;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "careers_study_levels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "careers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_careers_v_version_study_levels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_careers_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "career_lifecycle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_career_lifecycle_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "careers_study_levels" CASCADE;
  DROP TABLE "careers" CASCADE;
  DROP TABLE "_careers_v_version_study_levels" CASCADE;
  DROP TABLE "_careers_v" CASCADE;
  DROP TABLE "career_lifecycle" CASCADE;
  DROP TABLE "_career_lifecycle_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_careers_fk";

  DROP INDEX "payload_locked_documents_rels_careers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "careers_id";
  DROP TYPE "public"."enum_careers_study_levels";
  DROP TYPE "public"."enum_careers_type";
  DROP TYPE "public"."enum_careers_work_mode";
  DROP TYPE "public"."enum_careers_international";
  DROP TYPE "public"."enum_careers_status";
  DROP TYPE "public"."enum__careers_v_version_study_levels";
  DROP TYPE "public"."enum__careers_v_version_type";
  DROP TYPE "public"."enum__careers_v_version_work_mode";
  DROP TYPE "public"."enum__careers_v_version_international";
  DROP TYPE "public"."enum__careers_v_version_status";`)
}
