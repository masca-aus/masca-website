-- Reviewed additive rollout; apply through the Payload migration after owner review.
DO $$ BEGIN
    CREATE TYPE "public"."enum_users_departments" AS ENUM ('chairs','secretariat','treasury','amplifies','careers','cares','unites');
    EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "public"."users_departments" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "public"."enum_users_departments",
    CONSTRAINT "users_departments_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS "users_departments_order_idx" ON "public"."users_departments" ("order");
  CREATE INDEX IF NOT EXISTS "users_departments_parent_idx" ON "public"."users_departments" ("parent_id");
  ALTER TABLE "public"."users_departments" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON "public"."users_departments" FROM anon, authenticated;
