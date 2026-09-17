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
  const status = String(cellData || 'active');
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
    <EventActionMenu label={`Lifecycle for ${rowData?.title || 'opportunity'}`} text={status === 'closed' ? 'Closed' : status === 'archived' ? 'Archived' : 'Active'}
      tone={status === 'closed' ? 'approved' : status} disabled={busy || refreshing || rowData?.id == null} busy={busy || refreshing} onChoose={action => void run(action)}
      options={[
        ...(status === 'active' ? [{ value: 'close', label: 'Close opportunity' }] : []),
        status === 'archived' ? { value: 'restore', label: 'Restore opportunity' } : { value: 'archive', label: 'Archive opportunity' },
        ...(status === 'closed' ? [{ value: 'reopen', label: 'Reopen opportunity' }] : []),
      ]} />
    {(busy || refreshing) && <small role="status">Saving…</small>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
