import { MAX_AGE_DAYS_WITHOUT_CLOSE, melbourneToday } from '../../utils/careers.ts';
export type CMSCollection = 'events' | 'careers';
export type CMSStatus = { status: 'draft' | 'published' | 'archived'; hasChanges: boolean; expired?: boolean };
type Snapshot = { _status?: unknown; reviewStatus?: unknown; closes?: unknown; added?: unknown };

/** Only the current base document establishes publication; version history cannot. */
export function deriveCMSStatus(collection: CMSCollection, latest: Snapshot, live: Snapshot, stage: string, today = melbourneToday()): CMSStatus {
  const published = live._status === 'published' && (collection === 'careers' || live.reviewStatus === 'approved');
  const cutoff = new Date(`${today}T00:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - MAX_AGE_DAYS_WITHOUT_CLOSE);
  const expired = collection === 'careers' && published && stage === 'active' && (typeof live.closes === 'string' && live.closes ? live.closes < today : typeof live.added === 'string' && Boolean(live.added) && live.added < cutoff.toISOString().slice(0, 10));
  const status = stage === 'archived' || (collection === 'careers' && (stage === 'closed' || expired)) ? 'archived' : published ? 'published' : 'draft';
  return { status, hasChanges: published && latest._status === 'draft', ...(expired ? { expired: true } : {}) };
}
export const statusLabels = { draft: 'Draft', published: 'Published', archived: 'Archived' };
export function statusActions(_collection: CMSCollection, state: CMSStatus) {
  if (state.status === 'archived') return [{ value: 'restore', label: 'Restore as draft' }];
  const archive = { value: 'archive', label: 'Archive' };
  if (state.status === 'draft') return [{ value: 'publish', label: 'Publish' }, archive];
  return [
    ...(state.hasChanges ? [{ value: 'publish', label: 'Publish changes' }] : []),
    { value: 'unpublish', label: 'Move to draft' }, archive,
  ];
}
