import { EVENT_STATES } from './eventSubmission.ts';

export const EVENT_EDITOR_STEPS: { title: string; fields: string[] }[] = [
  { title: 'Basics', fields: ['title', 'organisation', 'description'] },
  { title: 'Date and location', fields: ['startDate', 'endDate', 'venue', 'state'] },
  { title: 'Poster and links', fields: ['poster', 'ticketURL'] },
  { title: 'Contact details', fields: ['contactName', 'contactEmail', 'internalNotes'] },
  { title: 'Preview and publish', fields: ['reviewStatus', 'reviewedAt'] },
];

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function timestamp(value: unknown): number {
  const input = text(value);
  if (!input) return NaN;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(input);
  if (!match) return NaN;
  const [, year, month, day] = match;
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)) return NaN;
  return Date.parse(input);
}

export function validateEventStep(data: Record<string, unknown>, step: number): Record<string, string> {
  if (step === 4) {
    return Object.assign({}, ...[0, 1, 2, 3].map((index) => validateEventStep(data, index)));
  }
  const errors: Record<string, string> = {};
  const requireText = (field: string, label: string) => {
    if (!text(data[field])) errors[field] = `Enter ${label}.`;
  };
  if (step === 0) {
    requireText('title', 'an event title');
    requireText('organisation', 'an organisation');
    requireText('description', 'an event description');
  }
  if (step === 1) {
    const start = timestamp(data.startDate);
    const end = timestamp(data.endDate);
    if (!Number.isFinite(start)) errors.startDate = 'Enter a valid start date.';
    if (text(data.endDate) && !Number.isFinite(end)) errors.endDate = 'Enter a valid end date.';
    else if (Number.isFinite(start) && Number.isFinite(end) && end < start) errors.endDate = 'End date must be on or after the start date.';
    requireText('venue', 'a venue');
    if (!EVENT_STATES.some(({ value }) => value === data.state)) errors.state = 'Select an Australian state or territory.';
  }
  if (step === 2 && text(data.ticketURL)) {
    try {
      if (new URL(text(data.ticketURL)).protocol !== 'https:') errors.ticketURL = 'Use a secure https:// link.';
    } catch {
      errors.ticketURL = 'Use a secure https:// link.';
    }
  }
  if (step === 3) {
    requireText('contactName', 'a contact name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(data.contactEmail))) errors.contactEmail = 'Enter a valid contact email address.';
  }
  return errors;
}

export function firstIncompleteEventStep(data: Record<string, unknown>): number {
  for (let step = 0; step < 4; step++) {
    if (Object.keys(validateEventStep(data, step)).length) return step;
  }
  return 4;
}

export function eventFieldStep(path: string): number {
  const field = path.split('.')[0];
  const step = EVENT_EDITOR_STEPS.findIndex(({ fields }) => fields.includes(field));
  return step < 0 ? 4 : step;
}

export function eventDraftFingerprint(data: Record<string, unknown>): string {
  const fields = EVENT_EDITOR_STEPS.flatMap(({ fields }) => fields).filter((field) => field !== 'reviewedAt');
  return JSON.stringify(fields.map((field) => {
    let value = data[field];
    if (field === 'poster' && value && typeof value === 'object' && 'id' in value) value = value.id;
    return [field, value == null || value === '' ? null : value];
  }));
}
