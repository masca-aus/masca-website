import type { PayloadHandler } from 'payload';
import { csvCell, lifecycleRecords, reportPeriodKey } from './eventLifecycle.ts';

export const eventReport: PayloadHandler = async req => {
  if (!req.user) return Response.json({ message: 'Sign in to view reports.' }, { status: 401 });
  const query = new URL(req.url ?? 'http://localhost').searchParams;
  const period = query.get('period') ?? '';
  if (!/^\d{4}(-(?:0[1-9]|1[0-2]))?$/.test(period) || Number(period.slice(0, 4)) < 1900 || Number(period.slice(0, 4)) > 2200) return Response.json({ message: 'Choose a valid month or year.' }, { status: 400 });
  const records = await lifecycleRecords(req.payload, req);
  const lifecycle = new Map(records.map(row => [typeof row.event === 'object' ? row.event.id : row.event, row]));
  const { docs } = await req.payload.find({ collection: 'events', draft: true, pagination: false, depth: 0, overrideAccess: false, req,
    select: { title: true, organisation: true, startDate: true, endDate: true, state: true, reviewStatus: true, _status: true } });
  const rows = docs.filter(doc => doc.startDate && Number.isFinite(Date.parse(doc.startDate)) && reportPeriodKey(doc.startDate, doc.state).startsWith(period)).map(doc => {
    const record = lifecycle.get(doc.id);
    return { id: doc.id, title: doc.title || 'Untitled event', organisation: doc.organisation || 'Not specified', startDate: doc.startDate, state: doc.state, lifecycle: record?.status ?? 'active', completedAt: record?.completedAt ?? null, reviewStatus: doc.reviewStatus, publication: doc._status };
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const counts = (key: 'state' | 'organisation') => Object.entries(rows.reduce<Record<string, number>>((totals, row) => { const label = row[key] || 'Not specified'; totals[label] = (totals[label] ?? 0) + 1; return totals; }, {})).sort((a,b) => b[1]-a[1]);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (query.get('format') === 'csv') {
    const columns = ['id', 'title', 'organisation', 'startDate', 'state', 'lifecycle', 'completedAt', 'reviewStatus', 'publication'] as const;
    const csv = [columns.map(csvCell).join(','), ...rows.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\r\n');
    return new Response('\uFEFF' + csv, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="masca-events-${period}.csv"` } });
  }
  return Response.json({ period, total: rows.length, completed: rows.filter(row => row.completedAt).length, archived: rows.filter(row => row.lifecycle === 'archived').length, organisations: counts('organisation'), states: counts('state'), rows, generatedAt: new Date().toISOString() }, { headers });
};
