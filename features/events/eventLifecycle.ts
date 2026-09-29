import { initTransaction, commitTransaction, killTransaction, type Payload, type PayloadRequest, type PayloadHandler, type Where } from 'payload';
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import { revalidatePath } from 'next/cache.js';
import { EVENT_TIME_ZONES } from './eventSubmission.ts';

export type Lifecycle = { status: string; completedAt?: string | null; archivedAt?: string | null };
export function nextLifecycle(previous: Lifecycle | null, action: string, now: string): Lifecycle {
  const current = previous ?? { status: 'active' };
  if (action === 'archive' && current.status !== 'archived') return { ...current, status: 'archived', archivedAt: now };
  if (action === 'complete' && current.status === 'active') return { ...current, status: 'completed', completedAt: now };
  if (action === 'reopen' && current.status === 'completed') return { ...current, status: 'active', completedAt: null };
  if (action === 'restore' && current.status === 'archived') return { ...current, status: current.completedAt ? 'completed' : 'active', archivedAt: null };
  throw new Error('This action is not available for the current event status. Refresh and try again.');
}
export async function lifecycleRecords(payload: Pick<Payload, 'find'>, req?: PayloadRequest) {
  return (await payload.find({ collection: 'event-lifecycle', pagination: false, depth: 0, overrideAccess: true, ...(req ? { req } : {}) })).docs;
}
export async function lifecycleIDs(payload: Pick<Payload, 'find'>, status: string, req?: PayloadRequest) {
  const records = await lifecycleRecords(payload, req);
  return records.filter(row => row.status === status).map(row => typeof row.event === 'object' ? row.event.id : row.event);
}
export async function eventListFilter({ req }: { req: PayloadRequest }): Promise<Where> {
  const archived = req.query?.eventView === 'archived';
  const completed = req.query?.eventView === 'completed';
  const records = await lifecycleRecords(req.payload, req);
  const statuses = archived ? ['archived'] : completed ? ['completed'] : ['completed', 'archived'];
  const ids = records.filter(row => statuses.includes(row.status)).map(row => typeof row.event === 'object' ? row.event.id : row.event);
  return { id: { [archived || completed ? 'in' : 'not_in']: ids.length ? ids : [-1] } };
}
export const eventLifecycleAction: PayloadHandler = async req => {
  if (!req.user) return Response.json({ message: 'Sign in to manage events.' }, { status: 401 });
  const id = req.routeParams?.id;
  if (typeof id !== 'string' && typeof id !== 'number') return Response.json({ message: 'Invalid event.' }, { status: 400 });
  let action: string;
  try { action = (await req.json!()).action; } catch { return Response.json({ message: 'Invalid action.' }, { status: 400 }); }
  await req.payload.findByID({ collection: 'events', id, req, overrideAccess: false, draft: true, depth: 0 });
  const ownsTransaction = await initTransaction(req);
  try {
  const tx = (req.payload.db as unknown as PostgresAdapter).sessions[String(await req.transactionID)]?.db;
  if (!tx) throw new Error('A transaction is required to update lifecycle.');
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7142, ${Number(id)}::integer)`);
  const previous = (await req.payload.find({ collection: 'event-lifecycle', where: { event: { equals: id } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0];
  let data;
  try { data = nextLifecycle(previous ?? null, action, new Date().toISOString()); }
  catch (error) { return Response.json({ message: (error as Error).message }, { status: 409 }); }
  const values = { ...data, event: Number(id), changedBy: req.user.id };
  // A separate versioned record avoids publishing, unpublishing or overwriting event drafts.
  if (previous) await req.payload.update({ collection: 'event-lifecycle', id: previous.id, data: values, req, overrideAccess: true });
  else await req.payload.create({ collection: 'event-lifecycle', data: values, req, overrideAccess: true });
  if (ownsTransaction) await commitTransaction(req);
  try { revalidatePath('/events'); revalidatePath('/'); } catch { /* Local API has no Next cache. */ }
  return Response.json(data);
  } finally { if (ownsTransaction && req.transactionID) await killTransaction(req); }
};
export function reportPeriodKey(date: string, state: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONES[state as keyof typeof EVENT_TIME_ZONES] ?? 'Australia/Brisbane', year: 'numeric', month: '2-digit' }).formatToParts(new Date(date));
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`;
}
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`;
}
