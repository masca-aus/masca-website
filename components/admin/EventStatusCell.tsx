'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useConfig } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import './eventStatusCell.css';
import { EventActionMenu } from './EventActionMenu';
import { publicationActions } from './publicationActions';

type CellProps = { cellData?: unknown; rowData?: { id?: number | string; title?: string; reviewStatus?: string; _status?: string } };
type StatusField = 'reviewStatus' | '_status';
const options = {
  reviewStatus: [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']],
  _status: [['draft', 'Draft'], ['published', 'Published']],
};
// Both cells for one event share the same pending state, preventing competing writes.
const pending = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = () => listeners.forEach(listener => listener());

function EventStatusSelect({ cellData, rowData, field }: CellProps & { field: StatusField }) {
  const { config } = useConfig();
  const router = useRouter();
  const id = rowData?.id;
  const key = String(id);
  const rowPending = useSyncExternalStore(subscribe, () => pending.has(key), () => false);
  const [refreshing, startTransition] = useTransition();
  const busy = rowPending || refreshing;
  const [error, setError] = useState('');
  const current = String(cellData ?? options[field][0][0]);
  const label = `${field === 'reviewStatus' ? 'Review status' : 'Publication status'} for ${rowData?.title || `event ${id}`}`;
  const change = async (value: string) => {
    if (id == null || pending.has(key) || value === current) return;
    pending.add(key); notify(); setError('');
    try {
      const response = await fetch(`${config.routes.api}/events/${encodeURIComponent(key)}/quick-status`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.errors?.[0]?.data?.errors;
        throw new Error(details?.map((item: { message: string }) => item.message).join(' ') || result.message || result.errors?.[0]?.message || 'Status could not be saved. Try again.');
      }
      // Refresh the current route, preserving filters and pagination. Payload's
      // refineListData does not fetch again when its query has not changed.
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status could not be saved. Try again.');
    } finally { pending.delete(key); notify(); }
  };
  return <div className="masca-status-action" onClick={event => event.stopPropagation()}>
    <EventActionMenu label={label} text={options[field].find(([value]) => value === current)?.[1] || (current === 'changed' ? 'Unpublished edits' : current)} tone={current}
      options={field === '_status' ? publicationActions(current).map(action => action.value === 'published' && rowData?.reviewStatus && rowData.reviewStatus !== 'approved' ? { ...action, label: 'Approve & publish' } : action) : options[field].map(([value, label]) => ({ value, label: value !== 'approved' ? `${label} (unpublish)` : label }))} current={field === '_status' ? undefined : current} disabled={busy || id == null} busy={busy} onChoose={value => void change(value)} />
    {busy && <span className="masca-status-action__feedback" role="status">Saving…</span>}
    {error && <div className="masca-status-action__error" role="alert">{error} <a href={`${config.routes.admin}/collections/events/${key}`}>Edit event</a></div>}
  </div>;
}
export function EventReviewStatusCell(props: CellProps) { return <EventStatusSelect {...props} field="reviewStatus" />; }
export function EventPublicationStatusCell(props: CellProps) { return <EventStatusSelect {...props} field="_status" />; }
