export function changeRequestSchemaSQL(schema:'public'|'cms_auth_preview'|'cms_calendar_preview'){
 return `CREATE TABLE IF NOT EXISTS "${schema}"."listing_change_requests" (
 id serial PRIMARY KEY, open_key varchar NOT NULL, listing_collection varchar NOT NULL, listing_i_d varchar NOT NULL,
 title varchar NOT NULL, message varchar NOT NULL, status varchar NOT NULL DEFAULT 'open', resolution varchar,
 resolved_at timestamptz, resolved_by varchar, updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS listing_change_requests_open_key_idx ON "${schema}"."listing_change_requests" (open_key);
 CREATE INDEX IF NOT EXISTS listing_change_requests_created_at_idx ON "${schema}"."listing_change_requests" (created_at);
 CREATE INDEX IF NOT EXISTS listing_change_requests_updated_at_idx ON "${schema}"."listing_change_requests" (updated_at);
 ALTER TABLE "${schema}"."listing_change_requests" ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON "${schema}"."listing_change_requests" FROM anon, authenticated;`;
}
