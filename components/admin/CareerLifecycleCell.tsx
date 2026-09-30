'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import './eventStatusCell.css';
import { EventActionMenu } from './EventActionMenu';
export function CareerLifecycleCell({ cellData, rowData }: { cellData?: unknown; rowData?: { id?: number | string; title?: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState('');
  const status = cellData === 'closed' ? 'archived' : String(cellData || 'active');
  async function run(action: string) {
    if (!action || busy || refreshing) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/careers/${rowData?.id}/lifecycle`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update this opportunity.');
      startTransition(() => router.refresh());
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <div className="masca-status-action">
    <EventActionMenu label={`Listing state for ${rowData?.title || 'opportunity'}`} text={status === 'archived' ? 'Archived' : 'Active'}
      tone={status} disabled={busy || refreshing || rowData?.id == null} busy={busy || refreshing} onChoose={action => void run(action)}
      options={[
        status === 'archived' ? { value: 'restore', label: 'Restore as draft' } : { value: 'archive', label: 'Archive opportunity' },
      ]} />
    {(busy || refreshing) && <small className="masca-status-action__announcement" role="status">Saving…</small>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
