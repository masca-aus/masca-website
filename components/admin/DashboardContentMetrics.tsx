import { AdminLink as Link } from './AdminNavigationContext';
import type { PermissionArea } from '@/features/access/workspacePolicy';
const labels: Record<PermissionArea, string> = { events: 'Events', careers: 'Careers', committee: 'Committee', sponsors: 'Sponsors', organisations: 'Organisations', media: 'Media' };

export function DashboardContentMetrics({ rows, branch }: { rows: { area: PermissionArea; count?: number; href: string }[]; branch: string }) {
  const max = Math.max(1, ...rows.map(row => row.count ?? 0));
  return <section className="masca-content-metrics" aria-labelledby="content-metrics-title">
    <div className="masca-insights__heading"><h2 id="content-metrics-title">Published content by section</h2><span className="masca-insights__period">{branch === 'all' ? 'All my branches' : branch} · Current snapshot</span></div>
    <p>Live content in your accessible sections. Careers includes current opportunities; archived items are excluded.</p>
    {rows.length ? <ul className="masca-content-metrics__bars">{rows.map(row => <li key={row.area}>
      <Link href={row.href}><span>{labels[row.area]}</span><strong>{row.count === undefined ? 'Unavailable' : new Intl.NumberFormat('en-AU').format(row.count)}</strong></Link>
      <div className="masca-content-metrics__track" aria-hidden="true"><span data-area={row.area} style={{ width: `${(row.count ?? 0) / max * 100}%` }} /></div>
    </li>)}</ul> : <p>No content sections are assigned to your account.</p>}
  </section>;
}
