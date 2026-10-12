import { ownershipScopes } from '@/features/access/workspacePolicy';
type Query = Pick<URLSearchParams, 'toString'>;
export type EventListView = 'current' | 'review' | 'archived';
export type EventListStatus = 'all' | 'draft' | 'published';
const isScope = (key: string) => key.startsWith('where[') && key.includes('[owningScope]');
const isStatus = (key: string) => key.startsWith('where[') && /\[(_status|submittedForReview)\]/.test(key);
export function eventListSelection(query: Query) {
  const params = new URLSearchParams(query.toString());
  const entries = [...params];
  const scopes = [...new Set(entries.filter(([key]) => isScope(key)).map(([,value])=>value))];
  const branch = scopes.length === 0 ? 'all' : scopes.length === 1 && ownershipScopes.includes(scopes[0] as typeof ownershipScopes[number]) ? scopes[0] : 'custom';
  const statuses = entries.filter(([key]) => key.includes('[_status][equals]')).map(([,value]) => value);
  const status: EventListStatus = statuses.includes('draft') ? 'draft' : statuses.includes('published') ? 'published' : 'all';
  const review = entries.some(([key,value]) => key.includes('[submittedForReview][equals]') && value === 'true');
  const view: EventListView = params.get('eventView') === 'archived' ? 'archived' : review ? 'review' : 'current';
  return {view,status,branch};
}
/** Change a list control without dropping its search, branch or display preferences. */
export function eventListHref(query: Query, change: { view?: EventListView; status?: EventListStatus; branch?: string; clear?: boolean }) {
  const params = new URLSearchParams(query.toString());
  const previous = eventListSelection(params);
  params.delete('page');
  if (change.clear) {
    for (const key of [...params.keys()]) if (key === 'search' || (key.startsWith('where[') && !isScope(key))) params.delete(key);
    if (previous.view === 'review') { params.set('where[submittedForReview][equals]','true'); params.set('where[_status][equals]','draft'); }
  }
  if (change.view || change.status) {
    for (const key of [...params.keys()]) if (isStatus(key)) params.delete(key);
    // Dashboard links carry the current archived-ID snapshot with a -1 sentinel.
    // The collection's server-side lifecycle filter owns this after changing views.
    if (change.view) {
      const generated = [...params].flatMap(([key,value]) => value === '-1' ? key.match(/^where\[and\]\[\d+\]\[id\]\[not_in\]/)?.[0] ?? [] : []);
      for (const key of [...params.keys()]) if (generated.some(prefix => key.startsWith(prefix))) params.delete(key);
    }
    const view = change.view ?? (previous.view === 'review' ? 'current' : previous.view);
    params.set('eventView',view === 'archived' ? 'archived' : 'current');
    if (view === 'review') { params.set('where[submittedForReview][equals]','true'); params.set('where[_status][equals]','draft'); }
    else if (change.status && change.status !== 'all') params.set('where[_status][equals]',change.status);
  }
  if (change.branch && (change.branch === 'all' || ownershipScopes.includes(change.branch as typeof ownershipScopes[number]))) {
    for (const key of [...params.keys()]) if (isScope(key)) params.delete(key);
    if (change.branch !== 'all') params.set('where[owningScope][equals]',change.branch);
  }
  return `/admin/collections/events${params.size ? `?${params}` : ''}`;
}
