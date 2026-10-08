import { expect, it } from 'vitest';
import type { PayloadRequest } from 'payload';
import { transactionRead } from '@/features/admin/transactionRead';

it('keeps separate transactions independent', async () => {
  const req = { payload: {}, transactionID: 'first' } as PayloadRequest;
  let release!: () => void;
  const first = transactionRead(req, () => new Promise<void>(resolve => { release = resolve; }));
  const second = transactionRead({ ...req, transactionID: 'second' }, async () => 'independent');
  expect(await second).toBe('independent');
  release();
  await first;
});

it('propagates a failed read and allows queued and subsequent reads to finish', async () => {
  const req = { payload: {}, transactionID: Promise.resolve('shared') } as PayloadRequest;
  const error = new Error('read failed');
  const first = transactionRead(req, async () => { throw error; });
  const second = transactionRead({ ...req }, async () => 'next');
  await expect(first).rejects.toBe(error);
  expect(await second).toBe('next');
  expect(await transactionRead(req, async () => 'later')).toBe('later');
});

it('does not serialize requests without a transaction', async () => {
  const req = { payload: {} } as PayloadRequest;
  let release!: () => void;
  const first = transactionRead(req, () => new Promise<void>(resolve => { release = resolve; }));
  expect(await transactionRead(req, async () => 'independent')).toBe('independent');
  release();
  await first;
});
