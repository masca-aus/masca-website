'use client';
import Link from 'next/link';
import { useAuth } from '@payloadcms/ui';
import { ListingTutorial, reviewQueueHref } from './ListingTutorial';
import { AdminSearchHelp } from './AdminSearchHelp';
import { EnsureStatusColumn } from './EnsureStatusColumn';
import { useSearchParams } from 'next/navigation';
import { SectionToolbar } from './SectionToolbar';
import './eventListTools.css';
export function CareerListTools() {
  const { user } = useAuth();
  const params = useSearchParams();
  const reviewing = params.get('where[submittedForReview][equals]') === 'true';
  const requested = params.get('careerView');
  const view = requested === 'closed' || requested === 'archived' ? 'archived' : 'active';
  return <div className="masca-event-tools masca-section-shell"><EnsureStatusColumn /><AdminSearchHelp /><SectionToolbar collection="careers" actions={<ListingTutorial collection="careers" accountId={user?.id} />}><nav aria-label="Career lists">
    {[['active', 'Current'], ['archived', 'Archived']].map(([key, label]) => <Link key={key} href={`/admin/collections/careers?careerView=${key}`} aria-current={!reviewing && view === key ? 'page' : undefined}>{label}</Link>)}
  <Link href={reviewQueueHref("careers")} aria-current={reviewing ? "page" : undefined}>To be reviewed</Link></nav></SectionToolbar>{view === 'archived' && <p>Archived and expired opportunities are kept for your records. Restore as a draft, review the details and dates, then publish when ready.</p>}</div>;
}
