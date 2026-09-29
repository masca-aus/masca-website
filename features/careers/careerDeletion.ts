import { APIError, type Access, type PayloadRequest } from 'payload';
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';

export const careerDeleteAccess: Access = ({ req }) => Boolean(req.user);

/** Serialize cleanup with lifecycle changes and remove associated history in the same transaction. */
export async function deleteCareerLifecycle({ id, req }: { id: string | number; req: PayloadRequest }) {
  if (!req.user) throw new APIError('Sign in to delete opportunities.', 403);
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]?.db;
  if (!tx) throw new APIError('A transaction is required to delete an opportunity.', 500);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7143, ${Number(id)}::integer)`);
  const lifecycle = (await req.payload.find({ collection: 'career-lifecycle', where: { career: { equals: id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
  // Payload deletes the lifecycle versions with the record, and the career versions with the career.
  if (lifecycle) await req.payload.delete({ collection: 'career-lifecycle', id: lifecycle.id, req, overrideAccess: true });
}
