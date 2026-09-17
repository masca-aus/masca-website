import { APIError, type Access, type PayloadRequest } from 'payload';
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import { lifecycleIDs } from './eventLifecycle.ts';

export const archivedEventDeleteAccess: Access = async ({ req }) => {
  if (!req.user) return false;
  const ids = await lifecycleIDs(req.payload, 'archived', req);
  return { id: { in: ids.length ? ids : [-1] } };
};

/** Recheck under the same lock as restore so stale selections cannot delete a restored event. */
export async function deleteArchivedEvent({ id, req }: { id: string | number; req: PayloadRequest }) {
  if (!req.user) throw new APIError('Sign in to delete events.', 403);
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]?.db;
  if (!tx) throw new APIError('A transaction is required to delete an event.', 500);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7142, ${Number(id)}::integer)`);
  const lifecycle = (await req.payload.find({ collection: 'event-lifecycle', where: { event: { equals: id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
  if (lifecycle?.status !== 'archived') throw new APIError('Archive this event before deleting it.', 403);
  // Payload deletes the lifecycle versions with the record, and the event versions with the event.
  await req.payload.delete({ collection: 'event-lifecycle', id: lifecycle.id, req, overrideAccess: true });
}
