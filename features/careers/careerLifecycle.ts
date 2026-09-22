import { initTransaction, commitTransaction, killTransaction, type Payload, type PayloadRequest, type PayloadHandler, type Where } from 'payload';
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import { revalidatePath } from 'next/cache.js';
import { melbourneToday, MAX_AGE_DAYS_WITHOUT_CLOSE } from '../../utils/careers.ts';

export type CareerState = { status: string; closedAt?: string | null; archivedAt?: string | null };
export function nextCareerLifecycle(previous: CareerState | null, action: string, now: string): CareerState {
  const current = previous ?? { status: 'active' };
  if (action === 'archive' && current.status !== 'archived') return { ...current, status: 'archived', archivedAt: now };
  if (action === 'close' && current.status === 'active') return { ...current, status: 'closed', closedAt: now };
  if (action === 'reopen' && current.status === 'closed') return { ...current, status: 'active', closedAt: null };
  if (action === 'restore' && current.status === 'archived') return { ...current, status: current.closedAt ? 'closed' : 'active', archivedAt: null };
  throw new Error('This action is unavailable for the current role status. Refresh and try again.');
}
export async function careerLifecycleRecords(payload: Pick<Payload, 'find'>, req?: PayloadRequest) {
  return (await payload.find({ collection: 'career-lifecycle', pagination: false, depth: 0, overrideAccess: true, ...(req ? { req } : {}) })).docs;
}
export async function careerLifecycleIDs(payload: Pick<Payload, 'find'>, statuses: string[], req?: PayloadRequest) {
  return (await careerLifecycleRecords(payload, req)).filter(row => statuses.includes(row.status)).map(row => typeof row.career === 'object' ? row.career.id : row.career);
}
/** Mirrors the existing board's calendar-day expiry, including 60-day rolling listings. */
export function careerDateWhere(today = melbourneToday()): Where {
  const cutoff = new Date(`${today}T00:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - MAX_AGE_DAYS_WITHOUT_CLOSE);
  return { or: [ { closes: { greater_than_equal: today } }, { and: [
    { or: [{ closes: { exists: false } }, { closes: { equals: '' } }] },
    { or: [{ added: { exists: false } }, { added: { equals: '' } }, { added: { greater_than_equal: cutoff.toISOString().slice(0, 10) } }] },
  ] } ] };
}
export function careerExpiredWhere(today = melbourneToday()): Where {
  const cutoff = new Date(`${today}T00:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - MAX_AGE_DAYS_WITHOUT_CLOSE);
  return { or: [
    { and: [{ closes: { exists: true } }, { closes: { not_equals: '' } }, { closes: { less_than: today } }] },
    { and: [
      { or: [{ closes: { exists: false } }, { closes: { equals: '' } }] },
      { added: { exists: true } }, { added: { not_equals: '' } }, { added: { less_than: cutoff.toISOString().slice(0, 10) } },
    ] },
  ] };
}
export async function careerListFilter({ req }: { req: PayloadRequest }): Promise<Where> {
  const view = req.query?.careerView;
  const records = await careerLifecycleRecords(req.payload, req);
  const idsFor = (status: string) => records.filter(row => row.status === status).map(row => typeof row.career === 'object' ? row.career.id : row.career);
  const archived = idsFor('archived');
  if (view === 'archived') return { id: { in: archived.length ? archived : [-1] } };
  // Use published dates: an unpublished extension must not reopen the live listing.
  const context = { ...req.context, cmsStatusRead: true };
  const expired = await req.payload.find({ collection: 'careers', draft: false, pagination: false, depth: 0,
    req: { ...req, context }, context, overrideAccess: false, select: { _status: true },
    where: { and: [{ _status: { equals: 'published' } }, careerExpiredWhere()] },
  });
  const closed = [...new Set([...idsFor('closed'), ...expired.docs.map(row => row.id)])];
  if (view === 'closed') return { and: [{ id: { in: closed.length ? closed : [-1] } }, { id: { not_in: archived.length ? archived : [-1] } }] };
  const hidden = [...new Set([...closed, ...archived])];
  return { id: { not_in: hidden.length ? hidden : [-1] } };
}
export const careerLifecycleAction: PayloadHandler = async req => {
  if (!req.user) return Response.json({ message: 'Sign in to manage careers.' }, { status: 401 });
  const id = Number(req.routeParams?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ message: 'Invalid role.' }, { status: 400 });
  let action: string;
  try { action = (await req.json!()).action; } catch { return Response.json({ message: 'Invalid action.' }, { status: 400 }); }
  if (!['close', 'archive', 'restore', 'reopen'].includes(action)) return Response.json({ message: 'Invalid action.' }, { status: 400 });
  await req.payload.findByID({ collection: 'careers', id, req, overrideAccess: false, draft: true, depth: 0 });
  const ownsTransaction = await initTransaction(req);
  try {
    const tx = (req.payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]?.db;
    if (!tx) throw new Error('A transaction is required to update lifecycle.');
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7143, ${id}::integer)`);
    const previous = (await req.payload.find({ collection: 'career-lifecycle', where: { career: { equals: id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
    let state: CareerState;
    try { state = nextCareerLifecycle(previous ?? null, action, new Date().toISOString()); }
    catch (error) { return Response.json({ message: (error as Error).message }, { status: 409 }); }
    const data = { ...state, career: id, changedBy: req.user.id };
    if (previous) await req.payload.update({ collection: 'career-lifecycle', id: previous.id, data, req, overrideAccess: true });
    else await req.payload.create({ collection: 'career-lifecycle', data, req, overrideAccess: true });
    if (ownsTransaction) await commitTransaction(req);
    try { revalidatePath('/careers'); } catch { /* Local API has no Next cache. */ }
    return Response.json(state);
  } finally { if (ownsTransaction && req.transactionID) await killTransaction(req); }
};
