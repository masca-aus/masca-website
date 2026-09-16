import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_state" AS ENUM('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT');
  CREATE TYPE "public"."enum_events_review_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_state" AS ENUM('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT');
  CREATE TYPE "public"."enum__events_v_version_review_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "events" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "organisation" varchar,
    "description" varchar,
    "start_date" timestamp(3) with time zone,
    "end_date" timestamp(3) with time zone,
    "venue" varchar,
    "state" "enum_events_state",
    "ticket_u_r_l" varchar,
    "poster_id" integer,
    "review_status" "enum_events_review_status" DEFAULT 'pending',
    "contact_name" varchar,
    "contact_email" varchar,
    "internal_notes" varchar,
    "reviewed_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_events_status" DEFAULT 'draft'
  );

  CREATE TABLE "_events_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_organisation" varchar,
    "version_description" varchar,
    "version_start_date" timestamp(3) with time zone,
    "version_end_date" timestamp(3) with time zone,
    "version_venue" varchar,
    "version_state" "enum__events_v_version_state",
    "version_ticket_u_r_l" varchar,
    "version_poster_id" integer,
    "version_review_status" "enum__events_v_version_review_status" DEFAULT 'pending',
    "version_contact_name" varchar,
    "version_contact_email" varchar,
    "version_internal_notes" varchar,
    "version_reviewed_at" timestamp(3) with time zone,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__events_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  ALTER TABLE "events" ADD CONSTRAINT "events_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_poster_id_media_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_poster_idx" ON "events" USING btree ("poster_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_poster_idx" ON "_events_v" USING btree ("version_poster_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");

  ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "public"."events" FROM anon, authenticated;
  ALTER TABLE "public"."_events_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "public"."_events_v" FROM anon, authenticated;`)
}

// Keep direct access revoked while reversing RLS. Drop children before parents
// without CASCADE so a new external dependency stops rollback instead of being
// silently removed. Payload executes this migration in a transaction.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   REVOKE ALL ON TABLE "public"."_events_v" FROM anon, authenticated;
  REVOKE ALL ON TABLE "public"."events" FROM anon, authenticated;
  ALTER TABLE "public"."_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "public"."events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_events_v";
  DROP TABLE "events";
  DROP TYPE "public"."enum_events_state";
  DROP TYPE "public"."enum_events_review_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_state";
  DROP TYPE "public"."enum__events_v_version_review_status";
  DROP TYPE "public"."enum__events_v_version_status";`)
}
