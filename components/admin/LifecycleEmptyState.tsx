'use client';
import { useListQuery } from '@payloadcms/ui';
import { AdminLink as Link } from './AdminNavigationContext';
import { eventListHref, eventListSelection } from './eventListNavigation';
import { useSearchParams } from 'next/navigation';

export function LifecycleEmptyState() {
  const { data, query, collectionSlug } = useListQuery();
  const params = useSearchParams();
  const events = collectionSlug === 'events';
  if (events && data?.docs.length === 0) {
    const { view, status, branch } = eventListSelection(params);
    const extraFilters = [...params.keys()].some(key => key.startsWith('where[') && !/\[(owningScope|submittedForReview|_status|id)\]/.test(key));
    const filtered = Boolean(query.search || params.get('search') || extraFilters || (view !== 'review' && status !== 'all'));
    const title = filtered ? 'No matching events' : view === 'review' ? 'Nothing awaiting review' : `No ${view} events`;
    const description = filtered ? 'Try another search or clear your filters. Your selected branch will stay selected.'
      : view === 'review' ? 'New event submissions will appear here when they need a review.'
      : view === 'archived' ? 'Archived events will appear here. You can restore them as drafts when needed.'
      : `Current events will appear here${branch !== 'all' ? ' for the selected branch' : ''}. Check Archived for past records.`;
    return <section className="masca-empty-state" aria-label={title}><h3>{title}</h3><p>{description}</p>
      {filtered ? <Link href={eventListHref(params, { clear: true })} className="masca-action masca-action--secondary">Clear search &amp; filters</Link>
        : <Link href={eventListHref(params, { view: view === 'current' ? 'archived' : 'current' })} className="masca-action masca-action--secondary">{view === 'current' ? 'View archived events' : 'Back to Current'}</Link>}
    </section>;
  }
  const requested = params.get(events ? 'eventView' : 'careerView');
  const view = !events && requested === 'closed' ? 'archived' : requested;
  if (data?.docs.length !== 0 || !['archived'].includes(view || '')) return null;
  const noun = events ? 'events' : 'opportunities';
  const filtered = Boolean(query.search || (query.where && Object.keys(query.where).length));
  const title = filtered ? `No matching ${noun}` : `No ${view} ${noun}`;
  const description = filtered ? 'Try another search or adjust your filters.'
    : view === 'archived' ? `Archived ${noun} will appear here. You can restore them when needed.`
    : events ? 'Events you mark as completed will appear here.' : 'Opportunities with closed applications will appear here.';
  return <section className="masca-empty-state" aria-label={title}>
    <h3>{title}</h3><p>{description}</p>
    <Link href={`/admin/collections/${collectionSlug}`} className="masca-action masca-action--secondary">Back to Current</Link>
  </section>;
}
