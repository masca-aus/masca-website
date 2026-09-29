import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';
import organisations from './data/20260917_organisations.json' with { type: 'json' };

// Only additive changes. The generated snapshot also caught older status-enum
// and media-column drift; those already exist and must not be recreated here.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "organisations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"abbreviation" varchar,
  	"university" varchar,
  	"state" varchar,
  	"aliases" varchar,
  	"listed" boolean DEFAULT true,
  	"source_u_r_l" varchar,
  	"source_checked_at" timestamp(3) with time zone,
  	"verification_notes" varchar,
  	"directory_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "events" ADD COLUMN "street_address" varchar;
  ALTER TABLE "events" ADD COLUMN "venue_details" varchar;
  ALTER TABLE "_events_v" ADD COLUMN "version_street_address" varchar;
  ALTER TABLE "_events_v" ADD COLUMN "version_venue_details" varchar;
  CREATE INDEX "organisations_name_idx" ON "organisations" USING btree ("name");
  CREATE UNIQUE INDEX "organisations_directory_key_idx" ON "organisations" USING btree ("directory_key");
  CREATE INDEX "organisations_updated_at_idx" ON "organisations" USING btree ("updated_at");
  CREATE INDEX "organisations_created_at_idx" ON "organisations" USING btree ("created_at");

  ALTER TABLE "organisations" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "organisations" FROM anon, authenticated;
  `);
  await seedOrganisations(db);
}

/** Frozen, source-attributed seed. Re-running never overwrites committee edits. */
export async function seedOrganisations(db: MigrateUpArgs['db']): Promise<void> {
  for (const row of organisations) {
    await db.execute(sql`
      INSERT INTO "organisations" ("directory_key", "name", "abbreviation", "university", "state", "aliases", "listed", "source_u_r_l", "source_checked_at", "verification_notes")
      VALUES (${row.directoryKey}, ${row.name}, ${row.abbreviation}, ${row.university}, ${row.state}, ${row.aliases}, ${row.listed}, ${row.sourceURL}, ${row.sourceCheckedAt}::timestamptz, ${row.verificationNotes})
      ON CONFLICT ("directory_key") DO NOTHING;
    `);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "organisations";
    ALTER TABLE "events" DROP COLUMN "street_address", DROP COLUMN "venue_details";
    ALTER TABLE "_events_v" DROP COLUMN "version_street_address", DROP COLUMN "version_venue_details";
  `);
}
