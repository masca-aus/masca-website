import { COMMITTEE_DEPARTMENTS } from '../../utils/committeeDepartments.js';
/** Match Payload's hasMany-select table; adding empty membership preserves every account. */
export function departmentSchemaSQL(schema: 'public' | 'cms_auth_preview' | 'cms_calendar_preview') {
  if (!['public', 'cms_auth_preview', 'cms_calendar_preview'].includes(schema)) throw new Error('Unsupported dashboard schema');
  const values = COMMITTEE_DEPARTMENTS.map(({ value }) => `'${value}'`).join(',');
  return `DO $$ BEGIN
    CREATE TYPE "${schema}"."enum_users_departments" AS ENUM (${values});
    EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS "${schema}"."users_departments" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "${schema}"."enum_users_departments",
    CONSTRAINT "users_departments_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "${schema}"."users"("id") ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS "users_departments_order_idx" ON "${schema}"."users_departments" ("order");
  CREATE INDEX IF NOT EXISTS "users_departments_parent_idx" ON "${schema}"."users_departments" ("parent_id");
  ALTER TABLE "${schema}"."users_departments" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON "${schema}"."users_departments" FROM PUBLIC, anon, authenticated;`;
}
