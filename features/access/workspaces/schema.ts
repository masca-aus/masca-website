import {committeeAreas,committeeScopes} from '../committeePolicy.ts';
export function workspaceCatalogSchemaSQL(schema:'public'|'cms_auth_preview'|'cms_calendar_preview',calendar:'media_calendar'|'media_calendar_preview'){
 const tools=JSON.stringify(committeeAreas);
 return `CREATE TABLE IF NOT EXISTS "${schema}".access_workspaces(
 id text PRIMARY KEY,name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),kind text NOT NULL CHECK(kind IN('committee','project')),status text NOT NULL DEFAULT 'active' CHECK(status IN('active','archived')),
 areas jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(areas)='array' AND areas <@ '${tools}'::jsonb),term_end timestamptz,sponsor_id text REFERENCES "${schema}".access_workspaces(id),revision text NOT NULL DEFAULT gen_random_uuid()::text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS access_workspace_name ON "${schema}".access_workspaces(lower(trim(name)));
 INSERT INTO "${schema}".access_workspaces(id,name,kind,areas) VALUES ${committeeScopes.map(id=>`('${id}','${id}','committee','${tools}')`).join(',')} ON CONFLICT(id) DO NOTHING;
 ALTER TABLE "${schema}".access_workspaces ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON "${schema}".access_workspaces FROM PUBLIC;
 CREATE OR REPLACE FUNCTION "${schema}".immutable_workspace_id() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN IF NEW.id<>OLD.id THEN RAISE EXCEPTION 'Workspace IDs are immutable'; END IF; RETURN NEW; END $fn$;
 DROP TRIGGER IF EXISTS immutable_workspace_id ON "${schema}".access_workspaces;
 CREATE TRIGGER immutable_workspace_id BEFORE UPDATE ON "${schema}".access_workspaces FOR EACH ROW EXECUTE FUNCTION "${schema}".immutable_workspace_id();
 DO $workspace$ DECLARE tab text; col text; saved_default text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "${schema}".access_workspaces FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "${schema}".access_workspaces FROM authenticated; END IF;
 FOREACH tab IN ARRAY ARRAY['events','careers','committee','sponsors','organisations','media','_events_v','_careers_v','_committee_v','_sponsors_v','_organisations_v','_media_v'] LOOP
 col:=CASE WHEN left(tab,1)='_' THEN 'version_owning_scope' ELSE 'owning_scope' END;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='${schema}' AND table_name=tab AND column_name=col) THEN
 SELECT column_default INTO saved_default FROM information_schema.columns WHERE table_schema='${schema}' AND table_name=tab AND column_name=col;
 EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT','${schema}',tab,col);
 EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE text USING %I::text','${schema}',tab,col,col);
 IF saved_default IS NOT NULL THEN EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT (%s)::text','${schema}',tab,col,saved_default); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname=tab||'_workspace_owner_fk' AND conrelid=format('%I.%I','${schema}',tab)::regclass) THEN
 EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY(%I) REFERENCES %I.access_workspaces(id)','${schema}',tab,tab||'_workspace_owner_fk',col,'${schema}'); END IF;
 EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I(%I)',tab||'_workspace_owner','${schema}',tab,col);
 END IF; END LOOP;
 FOREACH tab IN ARRAY ARRAY['posts','categories','revisions'] LOOP
 IF to_regclass(format('%I.%I','${calendar}',tab)) IS NOT NULL THEN
 EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS workspace_owner text GENERATED ALWAYS AS (data->>''owningScope'') STORED','${calendar}',tab);
 EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN workspace_owner SET NOT NULL','${calendar}',tab);
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname=tab||'_workspace_owner_fk' AND conrelid=format('%I.%I','${calendar}',tab)::regclass) THEN
 EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY(workspace_owner) REFERENCES %I.access_workspaces(id)','${calendar}',tab,tab||'_workspace_owner_fk','${schema}'); END IF;
 EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I(workspace_owner)',tab||'_workspace_owner','${calendar}',tab);
 END IF; END LOOP;
 IF to_regclass('"${calendar}".presence') IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='presence_workspace_owner_fk' AND conrelid='"${calendar}".presence'::regclass) THEN
 ALTER TABLE "${calendar}".presence ADD CONSTRAINT presence_workspace_owner_fk FOREIGN KEY(owning_scope) REFERENCES "${schema}".access_workspaces(id); END IF; END IF;
 END $workspace$;`;
}
