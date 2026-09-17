export const SPONSOR_STEPS = [
  { title: 'Sponsor details', description: 'Add the sponsor name and the date they joined MASCA.', fields: ['name', 'date'] },
  { title: 'Logo', description: 'Choose a logo for the homepage. A transparent background works best.', fields: ['logo'] },
  { title: 'Review and save', description: 'Check the sponsor details and logo. Saving makes these changes visible on the homepage.', fields: [] },
] as const;
export function sponsorFieldStep(field: string) {
  return Math.max(0, SPONSOR_STEPS.findIndex(step => (step.fields as readonly string[]).includes(field)));
}
export function sponsorStepErrors(data: Record<string, unknown>, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (typeof data.name !== 'string' || !data.name.trim()) errors.name = 'Enter the sponsor name.';
    if (!data.date || !Number.isFinite(new Date(String(data.date)).getTime())) errors.date = 'Choose a valid date.';
  }
  if (step === 1 && !data.logo) errors.logo = 'Choose a sponsor logo.';
  return errors;
}
