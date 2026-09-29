import { careerPublicationErrors } from './careerModel.ts';

export const CAREER_STEPS = [
  { title: 'Role and company', description: 'Introduce the opportunity and the organisation offering it.', fields: ['title', 'company', 'type', 'industry', 'companyWebsite', 'logoUrl'] },
  { title: 'Location and eligibility', description: 'Help students understand where they can work and who can apply.', fields: ['country', 'state', 'city', 'workMode', 'international', 'studyLevels', 'eligibility'] },
  { title: 'Application and details', description: 'Add application instructions and the details students need. Leave the closing date empty for rolling applications.', fields: ['applyUrl', 'closes', 'added', 'pay', 'description', 'tags', 'featured', 'slug', 'internalNotes'] },
  { title: 'Review and publish', description: 'Check the opportunity before publishing. Save a draft at any time to finish it later.', fields: [] },
] as const;
export function careerFieldStep(field: string) { return Math.max(0, CAREER_STEPS.findIndex(step => (step.fields as readonly string[]).includes(field.split('.')[0]))); }
export function careerStepErrors(data: Record<string, unknown>, step: number): Record<string, string> {
  const fields: readonly string[] = CAREER_STEPS[step]?.fields ?? [];
  return Object.fromEntries(Object.entries(careerPublicationErrors(data)).filter(([field]) => fields.includes(field)));
}
