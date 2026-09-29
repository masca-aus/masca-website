import { describe, expect, it, vi } from 'vitest';
import { eventReport } from '@/features/events/eventReports';
import { eventLifecycleAction, eventListFilter } from '@/features/events/eventLifecycle';
const docs = [
 { id: 1, title: 'Dinner', organisation: 'MASCA', startDate: '2026-12-31T14:30:00Z', state: 'VIC' },
 { id: 2, title: '=Unsafe', organisation: 'Club', startDate: '2026-12-31T14:30:00Z', state: 'WA' },
 { id: 3, title: 'No date' },
];
const records = [{ event: 1, status: 'archived', completedAt: '2027-01-02T00:00:00Z' }];
const request = (url = 'http://localhost/api/events/report?period=2027-01') => ({ url, user: { id: 1 }, payload: { find: vi.fn(async ({ collection }) => ({ docs: collection === 'events' ? docs : records })) } });
describe('event reports and lifecycle permissions', () => {
 it('denies anonymous reports and lifecycle actions before any query', async () => {
  const req = { ...request(), user: null };
  expect((await eventReport(req as never)).status).toBe(401);
  expect((await eventLifecycleAction(req as never)).status).toBe(401);
  expect(req.payload.find).not.toHaveBeenCalled();
 });
 it('includes archived events in their local month without duplicating versions', async () => {
  const response = await eventReport(request() as never);
  expect(await response.json()).toMatchObject({ total: 1, archived: 1, completed: 1, states: [['VIC', 1]] });
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
 });
 it('exports only the selected year and neutralises spreadsheet formulas', async () => {
  const response = await eventReport(request('http://localhost/api/events/report?period=2026&format=csv') as never);
  const csv = await response.text();
  expect(csv).toContain("'=Unsafe"); expect(csv).not.toContain('Dinner');
 });
 it('rejects invalid dates before querying', async () => {
  const req = request('http://localhost/api/events/report?period=2026-13');
  expect((await eventReport(req as never)).status).toBe(400); expect(req.payload.find).not.toHaveBeenCalled();
 });
 it('hides archives by default and includes them on their tab', async () => {
  const req = { ...request(), query: {} };
  expect(await eventListFilter({ req } as never)).toEqual({ id: { not_in: [1] } });
  req.query = { eventView: 'archived' };
  expect(await eventListFilter({ req } as never)).toEqual({ id: { in: [1] } });
 });
});
