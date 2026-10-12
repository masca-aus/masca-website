import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_care_pathways_category" AS ENUM('wellbeing', 'finance', 'settling', 'academic');
  CREATE TABLE "care_pathways_subsections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"detail" varchar NOT NULL,
  	"link_url" varchar
  );
  
  CREATE TABLE "care_pathways" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" "enum_care_pathways_category" NOT NULL,
  	"title" varchar NOT NULL,
  	"short_description" varchar NOT NULL,
  	"sort_order" numeric DEFAULT 1 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "care_pathways_id" integer;
  ALTER TABLE "care_pathways_subsections" ADD CONSTRAINT "care_pathways_subsections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."care_pathways"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "care_pathways_subsections_order_idx" ON "care_pathways_subsections" USING btree ("_order");
  CREATE INDEX "care_pathways_subsections_parent_id_idx" ON "care_pathways_subsections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "care_pathways_category_idx" ON "care_pathways" USING btree ("category");
  CREATE INDEX "care_pathways_updated_at_idx" ON "care_pathways" USING btree ("updated_at");
  CREATE INDEX "care_pathways_created_at_idx" ON "care_pathways" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_care_pathways_fk" FOREIGN KEY ("care_pathways_id") REFERENCES "public"."care_pathways"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_care_pathways_id_idx" ON "payload_locked_documents_rels" USING btree ("care_pathways_id");

  ALTER TABLE "care_pathways" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "care_pathways_subsections" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE "care_pathways", "care_pathways_subsections" FROM anon, authenticated;
  REVOKE ALL ON SEQUENCE "care_pathways_id_seq" FROM anon, authenticated;

  INSERT INTO "care_pathways" ("category", "title", "short_description", "sort_order") VALUES
    ('wellbeing', 'Wellbeing', 'Make space for your wellbeing and find a supportive next step.', 1),
    ('finance', 'Finance', 'Get a clearer view of costs, options, and practical support.', 2),
    ('settling', 'Settling in', 'Just landed in Australia? Get the essentials you need to settle in, find your feet, and survive those first few weeks away from home.', 3),
    ('academic', 'Academic', 'Find support that helps you stay connected to your study goals.', 4)
  ON CONFLICT ("category") DO NOTHING;

  INSERT INTO "care_pathways_subsections" ("id", "_order", "_parent_id", "title", "detail", "link_url")
  SELECT gen_random_uuid()::text, item.position, pathway.id, item.title, item.detail, item.link_url
  FROM (VALUES
    ('wellbeing', 0, 'Healthcare', 'Find a GP, doctor, hospital or other health service.', '/care/healthcare'),
    ('wellbeing', 1, 'Mental Health', 'Explore counselling, wellbeing support and professional care.', ''),
    ('wellbeing', 2, 'Personal Safety', 'Find support for safety concerns and unsafe situations.', ''),
    ('finance', 0, 'Budgeting', 'Make your money go further', ''),
    ('finance', 1, 'Work and income', 'Explore practical options', ''),
    ('finance', 2, 'Financial support', 'Find a place to begin', ''),
    ('settling', 0, 'Accommodation', 'Find a safer next step', ''),
    ('settling', 1, 'Local support', 'Connect with your state', ''),
    ('settling', 2, 'Community', 'Meet people who understand', ''),
    ('academic', 0, 'Study support', 'Get back into your rhythm', ''),
    ('academic', 1, 'Your options', 'Understand the next step', ''),
    ('academic', 2, 'Campus connection', 'Find help close to you', '')
  ) AS item(category, position, title, detail, link_url)
  JOIN "care_pathways" AS pathway ON pathway.category = item.category::"enum_care_pathways_category"
  WHERE NOT EXISTS (
    SELECT 1 FROM "care_pathways_subsections" AS existing
    WHERE existing."_parent_id" = pathway.id AND existing.title = item.title
  );`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error("The Cares CMS migration includes editable content. Roll forward instead of deleting that content.");
}
