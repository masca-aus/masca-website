'use client';
import Link from 'next/link';
import { AdminSearchHelp } from './AdminSearchHelp';
import { EnsureStatusColumn } from './EnsureStatusColumn';
import { useSearchParams } from 'next/navigation';
import { SectionToolbar } from './SectionToolbar';
import './eventListTools.css';
export function CareerListTools() {
  const params = useSearchParams();
  const requested = params.get('careerView');
  const view = requested === 'closed' || requested === 'archived' ? 'archived' : 'active';
  return <div className="masca-event-tools masca-section-shell"><EnsureStatusColumn /><AdminSearchHelp /><SectionToolbar collection="careers"><nav aria-label="Career lists">
    {[['active', 'Current'], ['archived', 'Archived']].map(([key, label]) => <Link key={key} href={`/admin/collections/careers?careerView=${key}`} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
  </nav></SectionToolbar>{view === 'archived' && <p>Archived and expired opportunities are kept for your records. Restore as a draft, review the details and dates, then publish when ready.</p>}</div>;
}
