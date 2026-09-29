'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useConfig } from '@payloadcms/ui';
import { EventActionMenu } from './EventActionMenu';
import { statusActions, statusLabels, type CMSCollection, type CMSStatus } from '@/features/admin/cmsStatus';
import './eventStatusCell.css';

type Props = { cellData?: CMSStatus; rowData?: { id?: number | string; title?: string } };
function CMSStatusCell({ collection, cellData, rowData }: Props & { collection: CMSCollection }) {
  const router = useRouter();
  const { config } = useConfig();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState('');
  if (!cellData || !(cellData.status in statusLabels)) return <span>—</span>;
  const state = cellData;
  async function choose(action: string) {
    if (busy || refreshing || rowData?.id == null) return;
    if (action === 'edit') { router.push(`${config.routes.admin}/collections/${collection}/${rowData.id}`); return; }
    setBusy(true); setError('');
    const publication = action === 'publish' || action === 'unpublish';
    try {
      const response = await fetch(`${config.routes.api}/${collection}/${encodeURIComponent(String(rowData.id))}/${publication ? 'quick-status' : 'lifecycle'}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publication ? { field: '_status', value: action === 'publish' ? 'published' : 'draft' } : { action }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.errors?.[0]?.data?.errors;
        throw new Error(details?.map((item: { message: string }) => item.message).join(' ') || result.message || result.errors?.[0]?.message || 'Could not update the status.');
      }
      startTransition(() => router.refresh());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the status.'); }
    finally { setBusy(false); }
  }
  return <div className="masca-status-action" onClick={event => event.stopPropagation()}>
    <EventActionMenu label={`Status for ${rowData?.title || 'item'}`} text={statusLabels[state.status]} tone={state.status}
      options={statusActions(collection, state)} disabled={busy || refreshing || rowData?.id == null} busy={busy || refreshing} onChoose={action => void choose(action)} />
    {state.status === 'published' && state.hasChanges && <small className="masca-status-action__feedback">Unpublished changes</small>}
    {state.expired && <small className="masca-status-action__feedback">Listing expired</small>}
    {(busy || refreshing) && <small className="masca-status-action__announcement" role="status">Saving…</small>}
    {error && <div className="masca-status-action__error" role="alert">{error} <a href={`${config.routes.admin}/collections/${collection}/${rowData?.id}`}>Edit details</a></div>}
  </div>;
}
export function EventCMSStatusCell(props: Props) { return <CMSStatusCell {...props} collection="events" />; }
export function CareerCMSStatusCell(props: Props) { return <CMSStatusCell {...props} collection="careers" />; }
