import { describe, expect, it, vi } from 'vitest';
import type { PayloadRequest } from 'payload';
import { Events } from '../collections/Events';
import { deleteEventLifecycle } from '../features/events/eventDeletion';
function request(status: string | null = 'archived', signedIn = true) {
 const execute = vi.fn().mockResolvedValue({});
 return { user: signedIn ? { id: 1 } : null, transactionID: 'tx', payload: {
  db: { sessions: { tx: { db: { execute } } } },
  find: vi.fn().mockResolvedValue({ docs: status ? [{ id: 8, event: 42, status }] : [] }),
  delete: vi.fn().mockResolvedValue({}),
 } } as unknown as PayloadRequest;
}
describe('event deletion', () => {
 it('denies anonymous deletion', async () => {
  expect(await Events.access!.delete!({ req: request('archived', false) })).toBe(false);
 });
 it.each(['active', 'completed', 'archived', null])('allows signed-in deletion for %s listings', async status => {
  const req = request(status);
  expect(await Events.access!.delete!({ req })).toBe(true);
  await deleteEventLifecycle({ id: 42, req });
  if (status) expect(req.payload.delete).toHaveBeenCalledWith({ collection: 'event-lifecycle', id: 8, req, overrideAccess: true });
  else expect(req.payload.delete).not.toHaveBeenCalled();
 });
 it('locks then removes the archived lifecycle and its history in the same transaction', async () => {
  const req = request();
  await deleteEventLifecycle({ id: 42, req });
  expect(req.payload.delete).toHaveBeenCalledWith({ collection: 'event-lifecycle', id: 8, req, overrideAccess: true });
 });
});
