export const COMMITTEE_STEPS = [
  { title: 'Identity', description: 'Introduce the member as they should appear in the public directory.', fields: ['name', 'university', 'course'] },
  { title: 'Role and term', description: 'Choose their position, department and committee term.', fields: ['role', 'department', 'year'] },
  { title: 'Portrait and profile', description: 'Choose a portrait and add any profile details you want to share.', fields: ['portrait', 'bio', 'linkedin_url'] },
  { title: 'Review and save', description: 'Check the member’s details. Saving makes these changes visible on the website.', fields: [] },
] as const;
export function committeeFieldStep(field: string) {
  return Math.max(0, COMMITTEE_STEPS.findIndex(step => (step.fields as readonly string[]).includes(field)));
}
export function committeeStepErrors(data: Record<string, unknown>, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = step === 0 ? ['name'] : step === 1 ? ['role', 'department', 'year'] : step === 2 ? ['portrait'] : [];
  for (const key of required) if (!data[key] || (typeof data[key] === 'string' && !String(data[key]).trim())) errors[key] = 'Please complete this field.';
  if (step === 1 && data.year && !/^\d{4}\/\d{4}$/.test(String(data.year))) errors.year = 'Use a committee term like 2026/2027.';
  if (step === 2 && data.linkedin_url) {
    try { if (new URL(String(data.linkedin_url)).protocol !== 'https:') errors.linkedin_url = 'Use a full URL starting with https://'; }
    catch { errors.linkedin_url = 'Use a full URL starting with https://'; }
  }
  return errors;
}
