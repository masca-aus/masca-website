'use client';
import { Link, useListQuery } from '@payloadcms/ui';
import { useSearchParams } from 'next/navigation';

export function LifecycleEmptyState() {
  const { data, query, collectionSlug } = useListQuery();
  const params = useSearchParams();
  const events = collectionSlug === 'events';
  const view = params.get(events ? 'eventView' : 'careerView');
  if (data?.docs.length !== 0 || !['closed', 'completed', 'archived'].includes(view || '')) return null;
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
