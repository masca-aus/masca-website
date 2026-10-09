export function reviewSchemaSQL(schema:'public'|'cms_auth_preview'|'cms_calendar_preview') {
 return ['events','careers'].map(table=>`ALTER TABLE "${schema}"."${table}" ADD COLUMN IF NOT EXISTS needs_changes boolean DEFAULT false, ADD COLUMN IF NOT EXISTS review_notes varchar;
ALTER TABLE "${schema}"."_${table}_v" ADD COLUMN IF NOT EXISTS version_needs_changes boolean DEFAULT false, ADD COLUMN IF NOT EXISTS version_review_notes varchar;`).join('\n');
}
