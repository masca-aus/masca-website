/** Schema is restricted to known CMS namespaces. */
export function listingEmailSchemaSQL(schema:'public'|'cms_auth_preview'|'cms_calendar_preview'){
 const provenance=['events','careers'].map(table=>`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS submission_received_at timestamptz; ALTER TABLE "${schema}"."_${table}_v" ADD COLUMN IF NOT EXISTS version_submission_received_at timestamptz; UPDATE "${schema}"."${table}" SET submission_received_at=created_at WHERE submitted_for_review=true AND submission_received_at IS NULL;`).join('\n');
 return provenance+`CREATE TABLE IF NOT EXISTS "${schema}"."listing_emails" (
 id serial PRIMARY KEY, key varchar NOT NULL, listing_collection varchar NOT NULL, listing_i_d varchar NOT NULL,
 kind varchar NOT NULL, email jsonb NOT NULL, sent_by varchar NOT NULL, sent_at timestamptz, provider_i_d varchar,
 updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS listing_emails_key_idx ON "${schema}"."listing_emails" (key);
 CREATE INDEX IF NOT EXISTS listing_emails_created_at_idx ON "${schema}"."listing_emails" (created_at);
 CREATE INDEX IF NOT EXISTS listing_emails_updated_at_idx ON "${schema}"."listing_emails" (updated_at);
 ALTER TABLE "${schema}"."listing_emails" ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON "${schema}"."listing_emails" FROM anon, authenticated;`;
}
