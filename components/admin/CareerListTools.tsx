'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SectionToolbar } from './SectionToolbar';
import './eventListTools.css';
export function CareerListTools() {
  const params = useSearchParams();
  const requested = params.get('careerView');
  const view = requested === 'closed' || requested === 'archived' ? requested : 'active';
  return <div className="masca-event-tools masca-section-shell"><SectionToolbar><nav aria-label="Career lists">
    {[['active', 'Active'], ['closed', 'Closed'], ['archived', 'Archived']].map(([key, label]) => <Link key={key} href={`/admin/collections/careers?careerView=${key}`} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
  </nav></SectionToolbar><p>Publication controls publishing. Listing state tracks whether applications are active, closed or archived.</p>{view === 'archived' && <p>Archived opportunities are kept for your records. Restore an opportunity to return it to its previous Active or Closed list, or select archived opportunities and choose Delete to permanently remove them and their change history.</p>}{view === 'closed' && <p>Closed opportunities are hidden from the public board. Reopen an opportunity when applications resume.</p>}</div>;
}
