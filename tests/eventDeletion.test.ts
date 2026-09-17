import { describe, expect, it, vi } from 'vitest';
import type { PayloadRequest } from 'payload';
import { Events } from '../collections/Events';
import { deleteArchivedEvent } from '../features/events/eventDeletion';
function request(status = 'archived', signedIn = true) {
 const execute = vi.fn().mockResolvedValue({});
 return { user: signedIn ? { id: 1 } : null, transactionID: 'tx', payload: {
  db: { sessions: { tx: { db: { execute } } } },
  find: vi.fn().mockResolvedValue({ docs: [{ id: 8, event: 42, status }] }),
  delete: vi.fn().mockResolvedValue({}),
 } } as unknown as PayloadRequest;
}
describe('archived event deletion', () => {
 it('denies anonymous deletion', async () => {
  expect(await Events.access!.delete!({ req: request('archived', false) })).toBe(false);
 });
 it('restricts single and bulk access to archived IDs', async () => {
  expect(await Events.access!.delete!({ req: request() })).toEqual({ id: { in: [42] } });
  expect(await Events.access!.delete!({ req: request('active') })).toEqual({ id: { in: [-1] } });
 });
 it.each(['active', 'completed'])('rejects a %s listing even after access was checked', async status => {
  const req = request(status);
  await expect(deleteArchivedEvent({ id: 42, req })).rejects.toThrow('Archive');
  expect(req.payload.delete).not.toHaveBeenCalled();
 });
 it('locks then removes the archived lifecycle and its history in the same transaction', async () => {
  const req = request();
  await deleteArchivedEvent({ id: 42, req });
  expect(req.payload.delete).toHaveBeenCalledWith({ collection: 'event-lifecycle', id: 8, req, overrideAccess: true });
 });
});
