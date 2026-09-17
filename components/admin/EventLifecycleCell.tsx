'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import './eventStatusCell.css';
import { EventActionMenu } from './EventActionMenu';
export function EventLifecycleCell({ cellData, rowData }: { cellData?: unknown; rowData?: { id?: number | string; title?: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState('');
  const status = String(cellData || 'active');
  async function run(action: string) {
    if (!action || busy || refreshing) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/events/${rowData?.id}/lifecycle`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update this event.');
      startTransition(() => router.refresh());
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <div className="masca-status-action">
    <EventActionMenu label={`Event stage for ${rowData?.title || 'event'}`} text={status === 'completed' ? 'Completed' : status === 'archived' ? 'Archived' : 'Active'}
      tone={status === 'completed' ? 'approved' : status} disabled={busy || refreshing || rowData?.id == null} busy={busy || refreshing} onChoose={action => void run(action)}
      options={[
        ...(status === 'active' ? [{ value: 'complete', label: 'Mark completed' }] : []),
        status === 'archived' ? { value: 'restore', label: 'Restore event' } : { value: 'archive', label: 'Archive event' },
        ...(status === 'completed' ? [{ value: 'reopen', label: 'Reopen event' }] : []),
      ]} />
    {(busy || refreshing) && <small role="status">Saving…</small>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
