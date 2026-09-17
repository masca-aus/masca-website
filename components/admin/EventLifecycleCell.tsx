'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import './eventStatusCell.css';
export function EventLifecycleCell({ cellData, rowData }: { cellData?: unknown; rowData?: { id?: number | string; title?: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState('');
  const status = String(cellData || 'active');
  async function run(action: string) {
    if (!action || busy || refreshing) return;
    if (action === 'history') { router.push(`/admin/collections/event-lifecycle?where[event][equals]=${rowData?.id}`); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/events/${rowData?.id}/lifecycle`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update this event.');
      startTransition(() => router.refresh());
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <div className="masca-status-action">
    <div className="masca-status-action__control"><select aria-label={`Lifecycle for ${rowData?.title || 'event'}`} value="" disabled={busy || refreshing} onChange={event => void run(event.target.value)}>
      <option value="" disabled>{status === 'completed' ? 'Completed' : status === 'archived' ? 'Archived' : 'Active'}</option>
      {status === 'active' && <option value="complete">End event</option>}
      {status !== 'archived' && <option value="archive">Archive event</option>}
      {status === 'archived' && <option value="restore">Restore event</option>}
      <option value="history">Lifecycle history</option>
    </select><span className="masca-status-action__chevron" aria-hidden="true">⌄</span></div>
    {(busy || refreshing) && <small role="status">Saving…</small>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
