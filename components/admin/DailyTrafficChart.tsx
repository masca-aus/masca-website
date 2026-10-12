'use client';

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { DailyTraffic } from '@/features/analytics/websiteAnalytics';
const label = (stamp: number | string) => new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(stamp));
const number = new Intl.NumberFormat('en-AU');

export function DailyTrafficChart({ rows, since, until }: { rows?: DailyTraffic[] | null; since: string; until: string }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  if (!rows) return <section className="masca-traffic-chart"><h3>Daily traffic</h3><p role="status">The daily chart is temporarily unavailable. Other reports may still be available.</p></section>;
  if (!rows.length) return <section className="masca-traffic-chart"><h3>Daily traffic</h3><p>No daily traffic recorded in this period.</p></section>;
  const start = Math.floor(Date.parse(since) / 86_400_000) * 86_400_000;
  const end = Math.floor((Date.parse(until) - 1) / 86_400_000) * 86_400_000;
  const days = Array.from({ length: Math.round((end - start) / 86_400_000) + 1 }, (_, i) => start + i * 86_400_000);
  const buckets = new Map(rows.map(row => [Date.parse(row.timestamp), row]));
  const max = Math.max(4, ...rows.flatMap(row => [row.pageviews, row.visitors]));
  const ceiling = Math.ceil(max / 4) * 4;
  const x = (day: number, width: number) => 42 + (day - start) / Math.max(86_400_000, end - start) * (width - 70);
  const y = (n: number) => 202 - n / ceiling * 166;
  function path(metric: 'pageviews' | 'visitors', width: number) {
    let drawing = false;
    return days.map(day => {
      const row = buckets.get(day);
      if (!row) { drawing = false; return ''; }
      const command = `${drawing ? 'L' : 'M'}${x(day, width)},${y(row[metric])}`;
      drawing = true;
      return command;
    }).join(' ');
  }
  const selected = Math.min(active ?? days.length - 1, days.length - 1);
  const selectedDay = days[selected];
  const selectedRow = buckets.get(selectedDay);
  const partial = selectedDay < Date.parse(since) || selectedDay + 86_400_000 > Date.parse(until);
  const valueText = `${label(selectedDay)} UTC: ${selectedRow ? `${number.format(selectedRow.pageviews)} page views, ${number.format(selectedRow.visitors)} visitors` : 'Unavailable'}${partial ? ' · Partial day' : ''}`;
  function inspectPointer(event: PointerEvent<HTMLDivElement>, width: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const coordinate = (event.clientX - rect.left) / rect.width * width;
    const index = Math.round((coordinate - 42) / (width - 70) * (days.length - 1));
    setActive(Math.max(0, Math.min(days.length - 1, index)));
  }
  function inspectKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1
      : event.key === 'ArrowLeft' ? Math.max(0, selected - 1)
      : event.key === 'ArrowRight' ? Math.min(days.length - 1, selected + 1) : undefined;
    if (event.key === 'Escape') { event.preventDefault(); setActive(null); }
    else if (index !== undefined) { event.preventDefault(); setActive(index); }
  }
  const chart = (width: number, compact: boolean) => (
    <div className={`masca-traffic-chart__plot ${compact ? 'masca-traffic-chart__mobile' : 'masca-traffic-chart__desktop'}`}
      role="slider" tabIndex={0} aria-label="Daily traffic by date" aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={days.length - 1} aria-valuenow={selected} aria-valuetext={valueText}
      aria-describedby={`${id}-instructions`} onFocus={() => setActive(selected)} onBlur={() => setActive(null)} onKeyDown={inspectKey}
      onPointerMove={event => inspectPointer(event, width)}
      onPointerDown={event => { event.currentTarget.focus({ preventScroll: true }); inspectPointer(event, width); }}
      onPointerLeave={event => { if (event.pointerType !== 'touch') setActive(null); }} onPointerCancel={() => setActive(null)}>
    <svg viewBox={`0 0 ${width} 244`} role="img" aria-labelledby={`${id}-${width}-title ${id}-${width}-description`}>
      <title id={`${id}-${width}-title`}>Daily page views and visitors</title><desc id={`${id}-${width}-description`}>Traffic from {label(since)} to {label(end)}. Exact values are in the daily data table below. Missing values appear as gaps.</desc>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="42" x2={width - 28} y1={y(ceiling / 4 * i)} y2={y(ceiling / 4 * i)} className="masca-traffic-chart__grid" /><text x="32" y={y(ceiling / 4 * i) + 4} textAnchor="end">{number.format(ceiling / 4 * i)}</text></g>)}
      {days.filter((_, index) => !compact || index % 2 === 0 || index === days.length - 1).map(day => <text key={day} x={x(day, width)} y="229" textAnchor="middle">{label(day)}</text>)}
      {(['pageviews', 'visitors'] as const).map(metric => <g key={metric} data-series={metric}>
        <path d={path(metric, width)} fill="none" strokeWidth="2.5" strokeDasharray={metric === 'visitors' ? '6 4' : undefined} />
        {rows.map(row => <circle key={row.timestamp} cx={x(Date.parse(row.timestamp), width)} cy={y(row[metric])} r="3.5" />)}
      </g>)}
      {active !== null && <g className="masca-traffic-chart__cursor" aria-hidden="true">
        <line x1={x(selectedDay, width)} x2={x(selectedDay, width)} y1="30" y2="202" />
        {selectedRow && <><circle className="masca-traffic-chart__point--pageviews" cx={x(selectedDay, width)} cy={y(selectedRow.pageviews)} r="5" /><circle className="masca-traffic-chart__point--visitors" cx={x(selectedDay, width)} cy={y(selectedRow.visitors)} r="5" /></>}
      </g>}
    </svg>
    {active !== null && <div role="tooltip" className="masca-traffic-chart__tooltip" style={{ left: `clamp(8px, calc(${x(selectedDay, width) / width * 100}% ${x(selectedDay, width) / width > .5 ? "- min(184px, 45%) - 12px" : "+ 12px"}), calc(100% - min(184px, 45%) - 8px))` }}>
      <strong>{label(selectedDay)} <span>UTC</span></strong>
      {selectedRow ? <><div><span>Page views</span><b>{number.format(selectedRow.pageviews)}</b></div><div><span>Visitors</span><b>{number.format(selectedRow.visitors)}</b></div></> : <p>Unavailable for this day</p>}
      {partial && <small>Partial day</small>}
    </div>}
    </div>
  );
  return <section className="masca-traffic-chart" aria-labelledby={`${id}-heading`}>
    <div className="masca-traffic-chart__heading"><h3 id={`${id}-heading`}>Daily traffic</h3><div className="masca-traffic-chart__legend"><span data-series="pageviews">Page views</span><span data-series="visitors">Visitors</span></div></div>
    <p id={`${id}-instructions`} className="masca-traffic-chart__instructions">Hover or tap a day to inspect. Use ← → when the chart is focused.</p>
    {chart(720, false)}{chart(360, true)}
    <p className="masca-traffic-chart__note">Daily buckets use UTC. The first and last day may be partial. Daily visitors are not added together to calculate the period total.</p>
    <div className="masca-traffic-chart__table"><button type="button" className="masca-traffic-chart__table-toggle" aria-expanded={tableOpen} aria-controls={`${id}-daily-data`} onClick={() => setTableOpen(open => !open)}>View daily data</button><div id={`${id}-daily-data`} className="masca-traffic-chart__table-panel" data-open={tableOpen} aria-hidden={!tableOpen} inert={!tableOpen}><div className="masca-traffic-chart__table-inner"><table><caption>Daily website traffic (UTC)</caption><thead><tr><th scope="col">Date</th><th scope="col">Page views</th><th scope="col">Visitors</th></tr></thead><tbody>{days.map(day => <tr key={day}><th scope="row">{label(day)}</th><td>{buckets.has(day) ? number.format(buckets.get(day)!.pageviews) : 'Unavailable'}</td><td>{buckets.has(day) ? number.format(buckets.get(day)!.visitors) : 'Unavailable'}</td></tr>)}</tbody></table></div></div></div>
  </section>;
}
