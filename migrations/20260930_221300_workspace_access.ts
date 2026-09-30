import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/** Additive rollout: preserve content, versions and legacy credentials for recovery. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
 await db.execute(sql`
CREATE TYPE "public"."enum_users_role" AS ENUM ('administrator','editor');
CREATE TYPE "public"."enum_users_status" AS ENUM ('invited','active','suspended');
CREATE TYPE "public"."enum_users_grants_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
CREATE TYPE "public"."enum_users_grants_area" AS ENUM ('events','careers','committee','sponsors');
ALTER TABLE "public"."users"
 ADD COLUMN "role" "public"."enum_users_role" DEFAULT 'editor' NOT NULL,
 ADD COLUMN "status" "public"."enum_users_status" DEFAULT 'invited' NOT NULL,
 ADD COLUMN "all_content_access" boolean DEFAULT false,
 ADD COLUMN "permissions" jsonb,
 ADD COLUMN "google_subject" varchar,
 ADD COLUMN "session_revision" varchar;
CREATE UNIQUE INDEX "users_google_subject_idx" ON "public"."users" ("google_subject");
CREATE TABLE "public"."users_grants" (
 "_order" integer NOT NULL, "_parent_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
 "id" varchar PRIMARY KEY, "area" "public"."enum_users_grants_area" NOT NULL,
 "scope" "public"."enum_users_grants_scope" NOT NULL
);
CREATE INDEX "users_grants_order_idx" ON "public"."users_grants" ("_order");
CREATE INDEX "users_grants_parent_id_idx" ON "public"."users_grants" ("_parent_id");
ALTER TABLE "public"."users_grants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."users_grants" FROM anon, authenticated;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."users" FROM anon, authenticated;
UPDATE "public"."users" SET session_revision = gen_random_uuid()::text;
UPDATE "public"."users" SET role='administrator', status='active' WHERE email='admin@masca.org.au';

CREATE TYPE "public"."enum_events_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."events" ADD COLUMN "owning_scope" "public"."enum_events_owning_scope";
UPDATE "public"."events" SET "owning_scope"='National';
CREATE TYPE "public"."enum_careers_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."careers" ADD COLUMN "owning_scope" "public"."enum_careers_owning_scope";
UPDATE "public"."careers" SET "owning_scope"='National';
CREATE TYPE "public"."enum_committee_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."committee" ADD COLUMN "owning_scope" "public"."enum_committee_owning_scope";
UPDATE "public"."committee" SET "owning_scope"='National';
ALTER TABLE "public"."committee" ALTER COLUMN "owning_scope" SET NOT NULL;
CREATE TYPE "public"."enum_sponsors_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."sponsors" ADD COLUMN "owning_scope" "public"."enum_sponsors_owning_scope";
UPDATE "public"."sponsors" SET "owning_scope"='National';
ALTER TABLE "public"."sponsors" ALTER COLUMN "owning_scope" SET NOT NULL;
CREATE TYPE "public"."enum__events_v_version_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."_events_v" ADD COLUMN "version_owning_scope" "public"."enum__events_v_version_owning_scope";
UPDATE "public"."_events_v" SET "version_owning_scope"='National';
CREATE TYPE "public"."enum__careers_v_version_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."_careers_v" ADD COLUMN "version_owning_scope" "public"."enum__careers_v_version_owning_scope";
UPDATE "public"."_careers_v" SET "version_owning_scope"='National';
CREATE TYPE "public"."enum__committee_v_version_owning_scope" AS ENUM ('National','QLD','NSW','VIC','ACT','SA','WA','TAS','NT');
ALTER TABLE "public"."_committee_v" ADD COLUMN "version_owning_scope" "public"."enum__committee_v_version_owning_scope";
UPDATE "public"."_committee_v" SET "version_owning_scope"='National';
ALTER TABLE "public"."_committee_v" ALTER COLUMN "version_owning_scope" SET NOT NULL;
`);
}
export async function down(_args: MigrateDownArgs): Promise<void> {
 throw new Error("Disable WORKSPACE_AUTH_ENABLED to roll back without deleting access data.");
}
