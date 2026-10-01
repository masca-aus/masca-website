import type { PayloadRequest } from 'payload';

const pending = new WeakMap<PayloadRequest['payload'], Map<string | number, Promise<void>>>();

/** Coordinate independent computed-field reads sharing a save transaction.
 * Callbacks must only read selected scalar fields or lifecycle records, so they
 * cannot recursively invoke these computed fields while holding the queue.
 */
export async function transactionRead<T>(req: PayloadRequest, read: () => Promise<T>): Promise<T> {
  if (!req.transactionID) return read();
  const id = await req.transactionID;
  if (!id) return read();
  let transactions = pending.get(req.payload);
  if (!transactions) {
    transactions = new Map();
    pending.set(req.payload, transactions);
  }
  const result = (transactions.get(id) ?? Promise.resolve()).then(read);
  const settled = result.then(() => undefined, () => undefined);
  transactions.set(id, settled);
  try {
    return await result;
  } finally {
    if (transactions.get(id) === settled) transactions.delete(id);
  }
}
