/** Fixed schema names only; shared by production migration and isolated preview setup. */
export function submissionSchemaSQL(schema: 'public' | 'cms_auth_preview'|'cms_calendar_preview') {
 return `
ALTER TABLE "${schema}"."events" ADD COLUMN IF NOT EXISTS submitted_for_review boolean DEFAULT false;
ALTER TABLE "${schema}"."_events_v" ADD COLUMN IF NOT EXISTS version_submitted_for_review boolean DEFAULT false;
ALTER TABLE "${schema}"."careers" ADD COLUMN IF NOT EXISTS submitted_for_review boolean DEFAULT false, ADD COLUMN IF NOT EXISTS contact_name varchar, ADD COLUMN IF NOT EXISTS contact_email varchar;
ALTER TABLE "${schema}"."_careers_v" ADD COLUMN IF NOT EXISTS version_submitted_for_review boolean DEFAULT false, ADD COLUMN IF NOT EXISTS version_contact_name varchar, ADD COLUMN IF NOT EXISTS version_contact_email varchar;
UPDATE "${schema}"."events" SET submitted_for_review=true WHERE review_status='pending' AND _status='draft' AND coalesce(contact_email,'')<>'';
UPDATE "${schema}"."_events_v" SET version_submitted_for_review=true WHERE version_review_status='pending' AND version__status='draft' AND coalesce(version_contact_email,'')<>'';
`;
}
