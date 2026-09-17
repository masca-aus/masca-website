import { describe, expect, it, vi } from 'vitest';
import type { PayloadRequest } from 'payload';
import { Careers } from '../collections/Careers';
import { deleteCareerLifecycle } from '../features/careers/careerDeletion';
function request(status: string | null = 'archived', signedIn = true) {
 const execute = vi.fn().mockResolvedValue({});
 return { user: signedIn ? { id: 1 } : null, transactionID: 'tx', payload: {
  db: { sessions: { tx: { db: { execute } } } },
  find: vi.fn().mockResolvedValue({ docs: status ? [{ id: 8, career: 42, status }] : [] }),
  delete: vi.fn().mockResolvedValue({}),
 } } as unknown as PayloadRequest;
}
describe('career deletion', () => {
 it('denies anonymous deletion', async () => {
  expect(await Careers.access!.delete!({ req: request('archived', false) })).toBe(false);
 });
 it.each(['active', 'closed', 'archived', null])('allows signed-in deletion for %s listings', async status => {
  const req = request(status);
  expect(await Careers.access!.delete!({ req })).toBe(true);
  await deleteCareerLifecycle({ id: 42, req });
  if (status) expect(req.payload.delete).toHaveBeenCalledWith({ collection: 'career-lifecycle', id: 8, req, overrideAccess: true });
  else expect(req.payload.delete).not.toHaveBeenCalled();
 });
 it('locks then removes the archived lifecycle and its history in the same transaction', async () => {
  const req = request();
  await deleteCareerLifecycle({ id: 42, req });
  expect(req.payload.delete).toHaveBeenCalledWith({ collection: 'career-lifecycle', id: 8, req, overrideAccess: true });
 });
});
