import { ArrowUpRight, Eye, UsersRound } from "lucide-react";
import type { AnalyticsBreakdown, WebsiteAnalyticsReport } from "@/features/analytics/websiteAnalytics";
import { DailyTrafficChart } from "./DailyTrafficChart";
import "./websiteInsights.css";

const number = new Intl.NumberFormat("en-AU");
const date = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
const time = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" });

const failureMessages = {
  access: "Check that the Vercel connection has access to this website.",
  plan: "Check Web Analytics availability on your Vercel plan.",
  "rate-limit": "Vercel is receiving too many requests. Try again shortly.",
  connection: "Vercel could not be reached. Try again shortly.",
  response: "Vercel returned an unexpected report. Try again shortly.",
};

function Breakdown({ title, rows }: { title: string; rows: AnalyticsBreakdown[] | null }) {
  const max = Math.max(1, ...(rows?.map(row => row.pageviews) ?? []));
  return <div className="masca-insights__breakdown">
    <div className="masca-insights__list-heading"><h3>{title}</h3><span>Page views</span></div>
    {rows === null ? <p className="masca-insights__empty">This breakdown is temporarily unavailable.</p>
      : rows.length === 0 ? <p className="masca-insights__empty">No traffic recorded in this period.</p>
      : <ol className="masca-insights__list">{rows.map((row, index) => <li key={`${index}-${row.label}`}>
        <div className="masca-insights__row"><span title={row.label}>{row.label}</span><strong>{number.format(row.pageviews)}</strong></div>
        <div className="masca-insights__track" aria-hidden="true"><span style={{ width: `${row.pageviews / max * 100}%` }} /></div>
      </li>)}</ol>}
  </div>;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`masca-insights__skeleton ${className}`} aria-hidden="true" />;
}

export function WebsiteInsightsLoading() {
  return <section className="masca-insights masca-insights--expanded masca-insights--loading" aria-label="Website insights" aria-busy="true">
    <div className="masca-insights__heading"><h2>Website insights</h2><span className="masca-insights__period">Whole website · Last 7 days</span></div>
    <p className="masca-dashboard__sr-only" role="status">Loading website insights…</p>
    <div className="masca-insights__metrics" aria-hidden="true">
      <article><span className="masca-insights__metric-label"><UsersRound size={18} />Visitors</span><Skeleton className="masca-insights__skeleton--value" /><Skeleton className="masca-insights__skeleton--note" /></article>
      <article><span className="masca-insights__metric-label"><Eye size={18} />Page views</span><Skeleton className="masca-insights__skeleton--value" /><Skeleton className="masca-insights__skeleton--note" /></article>
    </div>
    <div className="masca-traffic-chart" aria-hidden="true">
      <div className="masca-traffic-chart__heading"><h3>Daily traffic</h3><Skeleton className="masca-insights__skeleton--legend" /></div>
      <p className="masca-traffic-chart__instructions">Hover or tap a day to inspect. Use ← → when the chart is focused.</p>
      <div className="masca-traffic-chart__placeholder"><Skeleton /></div>
      <p className="masca-traffic-chart__note">Daily buckets use UTC. The first and last day may be partial. Daily visitors are not added together to calculate the period total.</p>
      <div className="masca-traffic-chart__placeholder-details"><Skeleton /></div>
    </div>
    <div className="masca-insights__breakdowns" aria-hidden="true">
      {["Top pages", "Traffic sources"].map(title => <div className="masca-insights__breakdown" key={title}>
        <div className="masca-insights__list-heading"><h3>{title}</h3><span>Page views</span></div>
        <div className="masca-insights__list">{[0, 1, 2, 3, 4].map(index => <div key={index}>
          <div className="masca-insights__row"><Skeleton className="masca-insights__skeleton--label" /><Skeleton className="masca-insights__skeleton--count" /></div>
          <Skeleton className="masca-insights__skeleton--track" />
        </div>)}</div>
      </div>)}
    </div>
    <div className="masca-insights__footer" aria-hidden="true"><Skeleton className="masca-insights__skeleton--footer" /><Skeleton className="masca-insights__skeleton--footer" /></div>
    <p className="masca-insights__privacy-note" aria-hidden="true">Source: Vercel Web Analytics. Traffic reflects visitors who allow analytics. Direct / unknown includes visits without a recorded source.</p>
  </section>;
}

export function WebsiteInsights({ report, expanded = false }: { report: WebsiteAnalyticsReport | null; expanded?: boolean }) {
  if (!report) return null;
  return <section className={`masca-insights${expanded ? " masca-insights--expanded" : ""}`} aria-labelledby="website-performance">
    <div className="masca-insights__heading">
      <div><h2 id="website-performance">Website insights</h2></div>
      <span className="masca-insights__period">Whole website · Last 7 days</span>
    </div>
    {report.status !== "ready" ? <div className="masca-insights__notice" role="status">
      <h3>{report.status === "setup" ? "Connect your website insights" : "Check the Vercel connection"}</h3>
      <p>{report.status === "setup" ? "Ask your site administrator to connect Vercel Web Analytics to see website traffic here." : failureMessages[report.reason]}</p>
      <a className="masca-insights__help" href="https://vercel.com/docs/analytics/web-analytics-api" target="_blank" rel="noopener noreferrer">Vercel connection guide <ArrowUpRight size={15} aria-hidden="true" /></a>
    </div> : <>
      <div className="masca-insights__metrics">
        <article><span className="masca-insights__metric-label"><UsersRound size={18} aria-hidden="true" />Visitors</span><strong className="masca-insights__value">{number.format(report.visitors)}</strong><span className="masca-insights__metric-note">Visitor count reported by Vercel</span></article>
        <article><span className="masca-insights__metric-label"><Eye size={18} aria-hidden="true" />Page views</span><strong className="masca-insights__value">{number.format(report.pageviews)}</strong><span className="masca-insights__metric-note">Views across your public website</span></article>
      </div>
      {expanded && <DailyTrafficChart rows={report.daily} since={report.since} until={report.until} />}
      {expanded ? <div>
        <div className="masca-insights__breakdowns"><Breakdown title="Top pages" rows={report.topPages} /><Breakdown title="Traffic sources" rows={report.sources} /></div>
      <div className="masca-insights__footer"><span>{date.format(new Date(report.since))} – {date.format(new Date(report.until))} · Report through {time.format(new Date(report.until))} AEST</span><span>Reports cached for up to 5 minutes</span></div>
      <p className="masca-insights__privacy-note">Source: Vercel Web Analytics. Traffic reflects visitors who allow analytics. Direct / unknown includes visits without a recorded source.</p>
</div> : <details className="masca-insights__details"><summary>Explore top pages and traffic sources</summary>
        <div className="masca-insights__breakdowns"><Breakdown title="Top pages" rows={report.topPages} /><Breakdown title="Traffic sources" rows={report.sources} /></div>
      <div className="masca-insights__footer"><span>{date.format(new Date(report.since))} – {date.format(new Date(report.until))} · Report through {time.format(new Date(report.until))} AEST</span><span>Reports cached for up to 5 minutes</span></div>
      <p className="masca-insights__privacy-note">Source: Vercel Web Analytics. Traffic reflects visitors who allow analytics. Direct / unknown includes visits without a recorded source.</p>
</details>}
    </>}
  </section>;
}
