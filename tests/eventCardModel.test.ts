import { expect, it } from 'vitest';
import { eventToPublicCard } from '../features/events/eventCardModel';
import type { Event } from '../payload-types';

it('maps a draft to the public card in its state timezone without private fields', () => {
  const result = eventToPublicCard({ id: 1, title: 'Draft event', organisation: 'MASCA', description: 'Welcome', startDate: '2026-10-01T23:30:00Z', state: 'QLD', venue: 'Hall', contactEmail: 'private@example.com', internalNotes: 'Private note', poster: { url: '/poster.jpg' } } as Event);
  expect(result.start.local).toBe('2026-10-02T09:30');
  expect(result.end.local).toBe(result.start.local);
  expect(result.logo?.url).toBe('/poster.jpg');
  expect(JSON.stringify(result)).not.toContain('private@example.com');
  expect(JSON.stringify(result)).not.toContain('Private note');
});
