import { committeeScopes } from "./committeePolicy.ts";
export function committeeAccessSchemaSQL(
  schema: "public" | "cms_auth_preview" | "cms_calendar_preview",
  calendar: "media_calendar" | "media_calendar_preview",
  activateDrafts = process.env.COMMITTEE_ACCESS_ENABLED === "true",
) {
  return `
 ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS committee_memberships jsonb;
 ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS committee_access_revision varchar DEFAULT gen_random_uuid()::text;
 ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS committee_access_reviewed_at timestamptz;
 ALTER TABLE "${schema}".users ADD COLUMN IF NOT EXISTS committee_access_reviewed_by text;
 CREATE TABLE IF NOT EXISTS "${schema}".committee_access_audit(id uuid PRIMARY KEY,actor_id text NOT NULL,target_id text NOT NULL,committee text NOT NULL,action text NOT NULL,before_data jsonb,after_data jsonb,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS committee_access_audit_target ON "${schema}".committee_access_audit(target_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS "${schema}".committee_access_reminders(id uuid PRIMARY KEY,recipient text NOT NULL,membership_id text NOT NULL,member_id text NOT NULL,committee text NOT NULL,expires_at timestamptz NOT NULL,days_before integer NOT NULL CHECK(days_before IN(30,7)),read boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(recipient,member_id,membership_id,expires_at,days_before));
 CREATE INDEX IF NOT EXISTS committee_access_reminders_recipient ON "${schema}".committee_access_reminders(recipient,created_at DESC);
 ALTER TABLE "${schema}".committee_access_audit ENABLE ROW LEVEL SECURITY;
 ALTER TABLE "${schema}".committee_access_reminders ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON "${schema}".committee_access_audit,"${schema}".committee_access_reminders FROM PUBLIC;
 DO $access$ DECLARE old_unique record; draft_area text; projection text; destinations text; source_columns text; column_to_relax text; BEGIN
 FOR old_unique IN SELECT conname FROM pg_constraint WHERE conrelid='"${schema}".committee_access_reminders'::regclass AND contype='u' AND pg_get_constraintdef(oid) NOT LIKE '%member_id%' LOOP EXECUTE format('ALTER TABLE "${schema}".committee_access_reminders DROP CONSTRAINT %I',old_unique.conname); END LOOP;
 CREATE UNIQUE INDEX IF NOT EXISTS committee_reminder_identity ON "${schema}".committee_access_reminders(recipient,member_id,membership_id,expires_at,days_before);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "${schema}".committee_access_audit,"${schema}".committee_access_reminders FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "${schema}".committee_access_audit,"${schema}".committee_access_reminders FROM authenticated; END IF;
 ${["events", "careers", "committee", "sponsors", "organisations", "media"]
   .map(
     (area) => `
 IF to_regclass('"${schema}".${area}') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='${schema}' AND t.typname='enum_${area}_owning_scope') THEN CREATE TYPE "${schema}"."enum_${area}_owning_scope" AS ENUM (${committeeScopes.map((s) => `'${s}'`).join(",")}); END IF;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS owning_scope "${schema}"."enum_${area}_owning_scope";
  UPDATE "${schema}"."${area}" SET owning_scope='National' WHERE owning_scope IS NULL;
  ALTER TABLE "${schema}"."${area}" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON "${schema}"."${area}" FROM PUBLIC;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "${schema}"."${area}" FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "${schema}"."${area}" FROM authenticated; END IF;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS shared_with jsonb;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS access_creator varchar;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS access_contributors jsonb;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS access_review jsonb;
  ALTER TABLE "${schema}"."${area}" ADD COLUMN IF NOT EXISTS access_published boolean DEFAULT false;
  UPDATE "${schema}"."${area}" SET access_published=true,access_creator='legacy-unattributed' WHERE access_creator IS NULL AND access_review IS NULL;
 END IF;
 IF to_regclass('"${schema}"._${area}_v') IS NOT NULL THEN
  ALTER TABLE "${schema}"."_${area}_v" ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON "${schema}"."_${area}_v" FROM PUBLIC;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "${schema}"."_${area}_v" FROM anon; END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "${schema}"."_${area}_v" FROM authenticated; END IF;
  ALTER TABLE "${schema}"."_${area}_v" ADD COLUMN IF NOT EXISTS version_shared_with jsonb;
  ALTER TABLE "${schema}"."_${area}_v" ADD COLUMN IF NOT EXISTS version_access_creator varchar;
  ALTER TABLE "${schema}"."_${area}_v" ADD COLUMN IF NOT EXISTS version_access_contributors jsonb;
  ALTER TABLE "${schema}"."_${area}_v" ADD COLUMN IF NOT EXISTS version_access_review jsonb;
  ALTER TABLE "${schema}"."_${area}_v" ADD COLUMN IF NOT EXISTS version_access_published boolean DEFAULT false;
 END IF;`,
   )
   .join("\n")}
 -- Sponsors and the directory gain private drafts only after activation. Prepare
 -- their tables now; legacy saves retain their published status while staged.
 FOREACH draft_area IN ARRAY ARRAY['sponsors','organisations'] LOOP
 IF to_regclass(format('%I.%I','${schema}',draft_area)) IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='${schema}' AND t.typname='enum_'||draft_area||'_status') THEN
   EXECUTE format('CREATE TYPE %I.%I AS ENUM (''draft'',''published'')','${schema}','enum_'||draft_area||'_status');
  END IF;
  EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS _status %I.%I DEFAULT ''published''','${schema}',draft_area,'${schema}','enum_'||draft_area||'_status');
  IF to_regclass(format('%I.%I','${schema}','_'||draft_area||'_v')) IS NULL THEN
   SELECT string_agg(format('%I AS %I',column_name,'version_'||column_name),',' ORDER BY ordinal_position),string_agg(format('%I','version_'||column_name),',' ORDER BY ordinal_position),string_agg(format('%I',column_name),',' ORDER BY ordinal_position)
   INTO projection,destinations,source_columns FROM information_schema.columns WHERE table_schema='${schema}' AND table_name=draft_area AND column_name<>'id';
   EXECUTE format('CREATE TABLE %I.%I AS SELECT id AS parent_id,%s FROM %I.%I WITH NO DATA','${schema}','_'||draft_area||'_v',projection,'${schema}',draft_area);
   EXECUTE format('ALTER TABLE %I.%I ADD COLUMN id serial PRIMARY KEY, ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL, ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL, ADD COLUMN latest boolean, ADD COLUMN autosave boolean','${schema}','_'||draft_area||'_v');
   EXECUTE format('ALTER TABLE %I.%I ADD FOREIGN KEY(parent_id) REFERENCES %I.%I(id) ON DELETE SET NULL','${schema}','_'||draft_area||'_v','${schema}',draft_area);
  END IF;
  IF ${activateDrafts ? "true" : "false"} THEN
   SELECT string_agg(format('%I','version_'||column_name),',' ORDER BY ordinal_position),string_agg(format('%I',column_name),',' ORDER BY ordinal_position)
   INTO destinations,source_columns FROM information_schema.columns WHERE table_schema='${schema}' AND table_name=draft_area AND column_name<>'id';
   EXECUTE format('INSERT INTO %I.%I(parent_id,%s,latest) SELECT id,%s,true FROM %I.%I base WHERE NOT EXISTS(SELECT 1 FROM %I.%I history WHERE history.parent_id=base.id AND history.latest=true)','${schema}','_'||draft_area||'_v',destinations,source_columns,'${schema}',draft_area,'${schema}','_'||draft_area||'_v');
  END IF;
  FOR column_to_relax IN SELECT column_name FROM information_schema.columns WHERE table_schema='${schema}' AND table_name=draft_area AND is_nullable='NO' AND column_name NOT IN('id','created_at','updated_at') LOOP
   EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL','${schema}',draft_area,column_to_relax);
  END LOOP;
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I(parent_id,latest)','_'||draft_area||'_v_parent_latest','${schema}','_'||draft_area||'_v');
  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY','${schema}','_'||draft_area||'_v');
  EXECUTE format('REVOKE ALL ON %I.%I FROM PUBLIC','${schema}','_'||draft_area||'_v');
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I.%I FROM anon','${schema}','_'||draft_area||'_v'); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I.%I FROM authenticated','${schema}','_'||draft_area||'_v'); END IF;
 END IF;
 END LOOP;
 IF to_regclass('"${schema}".media') IS NOT NULL THEN ALTER TABLE "${schema}".media ADD COLUMN IF NOT EXISTS prefix varchar; END IF;
 IF to_regclass('"${calendar}".posts') IS NOT NULL THEN
  UPDATE "${calendar}".categories SET data=jsonb_set(data,'{owningScope}','"National"'::jsonb) WHERE NOT data ? 'owningScope';
  UPDATE "${calendar}".posts SET data=jsonb_set(data,'{owningScope}','"National"'::jsonb) WHERE NOT data ? 'owningScope';
  UPDATE "${calendar}".posts SET data=jsonb_set(data,'{sharedWith}','[]'::jsonb) WHERE NOT data ? 'sharedWith';
  UPDATE "${calendar}".revisions SET data=jsonb_set(data,'{owningScope}','"National"'::jsonb) WHERE NOT data ? 'owningScope';
  UPDATE "${calendar}".revisions SET data=jsonb_set(data,'{sharedWith}','[]'::jsonb) WHERE NOT data ? 'sharedWith';
  CREATE INDEX IF NOT EXISTS calendar_posts_scope_planned ON "${calendar}".posts((data->>'owningScope'),planned_at);
  ALTER TABLE "${calendar}".presence ADD COLUMN IF NOT EXISTS owning_scope text DEFAULT 'National';
  UPDATE "${calendar}".presence SET owning_scope='National' WHERE owning_scope IS NULL;
  ALTER TABLE "${calendar}".presence ALTER COLUMN owning_scope SET NOT NULL;
 END IF;
 END $access$;`;
}
