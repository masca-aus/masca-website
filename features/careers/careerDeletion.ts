import { APIError, type Access, type PayloadRequest } from 'payload';
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import { careerLifecycleIDs } from './careerLifecycle.ts';

export const archivedCareerDeleteAccess: Access = async ({ req }) => {
  if (!req.user) return false;
  const ids = await careerLifecycleIDs(req.payload, ['archived'], req);
  return { id: { in: ids.length ? ids : [-1] } };
};

/** Recheck under the same lock as restore so stale selections cannot delete a restored role. */
export async function deleteArchivedCareer({ id, req }: { id: string | number; req: PayloadRequest }) {
  if (!req.user) throw new APIError('Sign in to delete opportunities.', 403);
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]?.db;
  if (!tx) throw new APIError('A transaction is required to delete an opportunity.', 500);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7143, ${Number(id)}::integer)`);
  const lifecycle = (await req.payload.find({ collection: 'career-lifecycle', where: { career: { equals: id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
  if (lifecycle?.status !== 'archived') throw new APIError('Archive this opportunity before deleting it.', 403);
  // Payload deletes the lifecycle versions with the record, and the career versions with the career.
  await req.payload.delete({ collection: 'career-lifecycle', id: lifecycle.id, req, overrideAccess: true });
}
