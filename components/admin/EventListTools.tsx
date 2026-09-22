'use client';
import Link from 'next/link';
import { EnsureStatusColumn } from './EnsureStatusColumn';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import './eventListTools.css';
import { SectionToolbar } from './SectionToolbar';

type Report = { period: string; total: number; completed: number; archived: number; organisations: [string, number][]; states: [string, number][]; rows: { id: number; title: string; organisation: string; startDate: string; state: string; lifecycle: string }[] };
export function EventListTools() {
  const params = useSearchParams();
  const requested = params.get('eventView');
  const view = requested === 'completed' || requested === 'archived' ? requested : 'current';
  const [reports, setReports] = useState(false);
  const [frequency, setFrequency] = useState('month');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setReport(null);
    try {
      const response = await fetch(`/api/events/report?period=${encodeURIComponent(period)}`, { credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Report unavailable.');
      setReport(data);
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  return <div className="masca-event-tools masca-section-shell"><EnsureStatusColumn />
    <SectionToolbar actions={<button className="masca-action masca-action--secondary" aria-expanded={reports} onClick={() => setReports(!reports)}>Reports</button>}><nav aria-label="Event lists">
      {[['current','Current'], ['completed','Completed'], ['archived','Archived']].map(([key, label]) => <Link key={key} href={`/admin/collections/events?eventView=${key}`} aria-current={view === key ? 'page' : undefined}>{label}</Link>)}
    </nav></SectionToolbar>

    {view === 'completed' && <p>Completed events are kept for your records. Reopen an event to return it to Current.</p>}
    {view === 'archived' && <p>Archived events are kept for your records and reports. Restore an event to return it to its previous Current or Completed list, or select archived events and choose Delete to permanently remove them, their history and their entries in reports.</p>}
    {reports && <section className="masca-event-report" aria-label="Event reports">
      <h2>Event reports</h2><p>Includes archived records, grouped by the event’s local start date. Uses the latest saved details. Events without a start date are excluded.</p>
      <form onSubmit={generate}><label>Report period<select disabled={busy} value={frequency} onChange={event => { setFrequency(event.target.value); setPeriod(event.target.value === 'year' ? period.slice(0,4) : `${period.slice(0,4)}-01`); setReport(null); }}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>
        <label>{frequency === 'month' ? 'Month' : 'Year'}<input required disabled={busy} type={frequency === 'month' ? 'month' : 'number'} min={frequency === 'year' ? 1900 : '1900-01'} max={frequency === 'year' ? 2200 : '2200-12'} value={period} onChange={event => { setPeriod(event.target.value); setReport(null); }} /></label>
        <button type="submit" className="masca-action masca-action--primary" disabled={busy}>{busy ? 'Generating…' : 'Generate report'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {report && <div className="masca-event-report__output">
        <h3>MASCA events · {report.period}</h3><p>{report.total} events · {report.completed} completed · {report.archived} archived · {report.organisations.length} organisations</p>
        <div className="masca-event-report__actions"><a className="masca-action masca-action--secondary" href={`/api/events/report?period=${report.period}&format=csv`}>Download CSV</a><button className="masca-action masca-action--secondary" onClick={() => window.print()}>Print / Save PDF</button></div>
        <div className="masca-event-report__breakdown"><div><h4>By state</h4>{report.states.map(([name, count]) => <p key={name}>{name}: {count}</p>)}</div><div><h4>By organisation</h4>{report.organisations.map(([name, count]) => <p key={name}>{name}: {count}</p>)}</div></div>
        {!report.total ? <p>No events in this period.</p> : <div className="masca-event-report__table"><table><thead><tr><th>Event</th><th>Organisation</th><th>State</th><th>Event stage</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.id}><td>{row.title}</td><td>{row.organisation}</td><td>{row.state}</td><td>{row.lifecycle}</td></tr>)}</tbody></table></div>}
      </div>}
    </section>}
  </div>;
}
