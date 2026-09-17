import { describe, expect, it } from 'vitest';
import { nextLifecycle, eventListFilter, reportPeriodKey, csvCell } from '@/features/events/eventLifecycle';

describe('event lifecycle', () => {
 it('retains completion when archiving and restoring', () => {
  const completed = nextLifecycle(null, 'complete', '2026-09-17T00:00:00Z');
  const archived = nextLifecycle(completed, 'archive', '2026-09-18T00:00:00Z');
  expect(archived.completedAt).toBe(completed.completedAt);
  expect(nextLifecycle(archived, 'restore', '2026-09-19T00:00:00Z')).toMatchObject({ status: 'completed', archivedAt: null });
 });
 it('restores an uncompleted event to active and rejects invalid transitions', () => {
  expect(nextLifecycle(nextLifecycle(null, 'archive', 'now'), 'restore', 'now').status).toBe('active');
  expect(() => nextLifecycle(null, 'restore', 'now')).toThrow();
  expect(() => nextLifecycle({ status: 'archived' }, 'complete', 'now')).toThrow();
 });
 it('groups by the event local date at month/year boundaries', () => {
  expect(reportPeriodKey('2026-12-31T14:30:00Z', 'VIC')).toBe('2027-01');
  expect(reportPeriodKey('2026-12-31T14:30:00Z', 'WA')).toBe('2026-12');
 });
 it('escapes quotes and neutralises spreadsheet formulas', () => {
  expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
  expect(csvCell('Dinner, "hello"')).toBe('"Dinner, ""hello"""');
 });
});

it('reopens completed events and clears completion before a later archive/restore', () => {
 const active = nextLifecycle({ status: 'completed', completedAt: 'yesterday' }, 'reopen', 'today');
 expect(active).toMatchObject({ status: 'active', completedAt: null });
 expect(nextLifecycle(nextLifecycle(active, 'archive', 'today'), 'restore', 'tomorrow').status).toBe('active');
 expect(() => nextLifecycle({ status: 'archived' }, 'reopen', 'today')).toThrow();
});
it('keeps active, completed and archived event lists separate', async () => {
 const payload = { find: async () => ({ docs: [{ event: 1, status: 'completed' }, { event: 2, status: 'archived' }, { event: 3, status: 'active' }] }) };
 const filter = (eventView: string) => eventListFilter({ req: { payload, query: { eventView } } as never });
 expect(await filter('current')).toEqual({ id: { not_in: [1, 2] } });
 expect(await filter('completed')).toEqual({ id: { in: [1] } });
 expect(await filter('archived')).toEqual({ id: { in: [2] } });
});
