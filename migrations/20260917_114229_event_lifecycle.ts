import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "event_lifecycle" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"status" varchar NOT NULL,
  	"completed_at" timestamp(3) with time zone,
  	"archived_at" timestamp(3) with time zone,
  	"changed_by_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_event_lifecycle_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_event_id" integer NOT NULL,
  	"version_status" varchar NOT NULL,
  	"version_completed_at" timestamp(3) with time zone,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_changed_by_id" integer NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "event_lifecycle" ADD CONSTRAINT "event_lifecycle_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "event_lifecycle" ADD CONSTRAINT "event_lifecycle_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_event_lifecycle_v" ADD CONSTRAINT "_event_lifecycle_v_parent_id_event_lifecycle_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."event_lifecycle"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_event_lifecycle_v" ADD CONSTRAINT "_event_lifecycle_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_event_lifecycle_v" ADD CONSTRAINT "_event_lifecycle_v_version_changed_by_id_users_id_fk" FOREIGN KEY ("version_changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "event_lifecycle_event_idx" ON "event_lifecycle" USING btree ("event_id");
  CREATE INDEX "event_lifecycle_changed_by_idx" ON "event_lifecycle" USING btree ("changed_by_id");
  CREATE INDEX "event_lifecycle_updated_at_idx" ON "event_lifecycle" USING btree ("updated_at");
  CREATE INDEX "event_lifecycle_created_at_idx" ON "event_lifecycle" USING btree ("created_at");
  CREATE INDEX "_event_lifecycle_v_parent_idx" ON "_event_lifecycle_v" USING btree ("parent_id");
  CREATE INDEX "_event_lifecycle_v_version_version_event_idx" ON "_event_lifecycle_v" USING btree ("version_event_id");
  CREATE INDEX "_event_lifecycle_v_version_version_changed_by_idx" ON "_event_lifecycle_v" USING btree ("version_changed_by_id");
  CREATE INDEX "_event_lifecycle_v_version_version_updated_at_idx" ON "_event_lifecycle_v" USING btree ("version_updated_at");
  CREATE INDEX "_event_lifecycle_v_version_version_created_at_idx" ON "_event_lifecycle_v" USING btree ("version_created_at");
  CREATE INDEX "_event_lifecycle_v_created_at_idx" ON "_event_lifecycle_v" USING btree ("created_at");
  CREATE INDEX "_event_lifecycle_v_updated_at_idx" ON "_event_lifecycle_v" USING btree ("updated_at");
  ALTER TABLE "event_lifecycle" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "_event_lifecycle_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "event_lifecycle", "_event_lifecycle_v" FROM anon, authenticated;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_lifecycle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_event_lifecycle_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_lifecycle" CASCADE;
  DROP TABLE "_event_lifecycle_v" CASCADE;
`)
}
