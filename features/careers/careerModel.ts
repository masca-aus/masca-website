import { JOB_TYPE_LABEL, STUDY_LEVEL_LABEL, toJob, type Job, type JobType, type StudyLevel } from '../../utils/careers.ts';

export function validCareerDate(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validCareerURL(value: unknown, email = false): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const text = value.trim();
  if (email && /^(mailto:)?[^\s@?:/]+@[^\s@?:/]+\.[^\s@?:/]+$/i.test(text)) return true;
  try { const url = new URL(text); return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password && !/\s/.test(text); }
  catch { return false; }
}
export function careerPublicationErrors(data: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const name of ['title', 'company']) if (typeof data[name] !== 'string' || !String(data[name]).trim()) errors[name] = 'Please complete this field.';
  if (!validCareerURL(data.applyUrl, true)) errors.applyUrl = 'Enter a full https:// application link or an email address.';
  for (const name of ['companyWebsite', 'logoUrl']) if (data[name] && !validCareerURL(data[name])) errors[name] = 'Enter a full http:// or https:// URL.';
  if (data.logoUrl && !String(data.logoUrl).startsWith('https://')) errors.logoUrl = 'Use an https:// logo URL.';
  for (const name of ['closes', 'added']) if (!validCareerDate(data[name])) errors[name] = 'Use a real date in YYYY-MM-DD format.';
  return errors;
}

/** Explicit public allowlist. Raw CMS records, private notes and provenance never reach the board. */
export function careerToJob(data: Record<string, unknown>, today: string): Job | null {
  if (data._status !== 'published' || Object.keys(careerPublicationErrors(data)).length) return null;
  const text = (key: string) => typeof data[key] === 'string' ? data[key] as string : '';
  const levels = Array.isArray(data.studyLevels) ? data.studyLevels as StudyLevel[] : [];
  const result = toJob({
    published: 'TRUE', id: text('slug'), title: text('title'), company: text('company'),
    type: JOB_TYPE_LABEL[text('type') as JobType] || 'Other', companyWebsite: text('companyWebsite'), logoUrl: text('logoUrl'),
    country: text('country'), state: text('state'), city: text('city'), workMode: text('workMode'),
    international: text('international'), studyLevels: levels.map(value => STUDY_LEVEL_LABEL[value]).join(','),
    industry: text('industry'), eligibility: text('eligibility'), apply: text('applyUrl'),
    closes: text('closes'), added: text('added'), pay: text('pay'), description: text('description'), tags: text('tags'),
    featured: data.featured ? 'TRUE' : 'FALSE',
  }, { today, rowNumber: Number(data.id) || 0, hasPublishedColumn: true });
  return 'job' in result ? { ...result.job, id: text('slug') || result.job.id } : null;
}
