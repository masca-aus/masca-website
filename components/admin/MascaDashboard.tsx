import Link from "next/link";
import { Users, ImageIcon, Handshake, Building2 } from "lucide-react";
import { EVENT_TIME_ZONES } from "@/features/events/eventSubmission";
import "./dashboard.css";
import type { PayloadRequest } from "payload";

import { loadEventDashboard, type EventDashboardOverview } from "@/features/events/eventDashboard";

const contentAreas = [
  {
    name: "Organisations",
    Icon: Building2,
    description: "Keep the student organisation directory and search results up to date.",
    href: "/admin/collections/organisations",
    createHref: "/admin/collections/organisations/create",
    action: "Add organisation",
  },
  {
    name: "Committee",
    Icon: Users,
    description: "Manage committee members, portraits, roles and departments.",
    href: "/admin/collections/committee",
    createHref: "/admin/collections/committee/create",
    action: "Add member",
  },
  {
    name: "Media",
    Icon: ImageIcon,
    description: "Upload and organise the images used throughout the website.",
    href: "/admin/collections/media",
    createHref: "/admin/collections/media/create",
    action: "Upload image",
  },
  {
    name: "Sponsors",
    Icon: Handshake,
    description: "Keep partner names, logos and sponsorship dates up to date.",
    href: "/admin/collections/sponsors",
    createHref: "/admin/collections/sponsors/create",
    action: "Add sponsor",
  },
] as const;

export async function MascaDashboard({ initPageResult }: { initPageResult: { req: PayloadRequest } }) {
  const { req } = initPageResult;
  const overview = await loadEventDashboard(req.payload, req);
  return <DashboardContent overview={overview} />;
}

function displayDate(value?: string, state?: string, part?: 'day' | 'month') {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const timeZone = EVENT_TIME_ZONES[state as keyof typeof EVENT_TIME_ZONES] ?? 'Australia/Brisbane';
  return new Intl.DateTimeFormat('en-AU', { timeZone, ...(part === 'day' ? { day: 'numeric' } : part === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) }).format(new Date(value));
}

export function DashboardContent({ overview }: { overview: EventDashboardOverview }) {
  return (
    <main className="masca-dashboard" style={{ marginInline: "auto" }}>
      <header className="masca-dashboard__heading">
        <div><span className="masca-dashboard__eyebrow">MASCA CMS</span><h1>Your workspace</h1><p>Manage events and keep the website up to date.</p></div>
        <Link className="masca-action masca-action--quiet" href="/" target="_blank" rel="noopener noreferrer">View website ↗</Link>
      </header>
      <section aria-labelledby="events-overview">
        <div className="masca-dashboard__section-heading">
          <div><h2 id="events-overview">Events</h2><p>Create an event, pick up a draft or review a submission.</p></div>
          <Link className="masca-action masca-action--primary" href="/admin/collections/events/create">Create event</Link>
        </div>
        <div className="masca-dashboard__shortcuts">
          <Link href="/admin/collections/events?where[_status][equals]=draft"><strong>{overview.drafts}</strong><span>Resume drafts<small>{overview.drafts ? "Continue where the committee left off" : "No drafts yet"}</small></span><span aria-hidden="true">→</span></Link>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=pending"><strong>{overview.pending}</strong><span>Review submissions<small>{overview.pending ? "Ready for the committee to review" : "All caught up"}</small></span><span aria-hidden="true">→</span></Link>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=approved&where[_status][equals]=published"><strong>{overview.published}</strong><span>Published events<small>Visible on the website</small></span><span aria-hidden="true">→</span></Link>
        </div>
        <div className="masca-dashboard__event-columns"><div><div className="masca-dashboard__queue-heading"><h3>Newest submissions</h3><Link className="masca-action masca-action--quiet" href="/admin/collections/events">Manage all events →</Link></div>
        {overview.pendingEvents.length === 0 ? <p className="masca-dashboard__empty">No events awaiting review.</p> : <ul className="masca-dashboard__queue">
          {overview.pendingEvents.map(event => <li key={event.id}><Link href={`/admin/collections/events/${event.id}`}><span><strong>{event.title?.trim() || "Untitled event"}</strong><small>{event.organisation}{event.createdAt && <> · Submitted {displayDate(event.createdAt)}</>}</small></span><span className="masca-dashboard__badge">Pending review</span><span aria-hidden="true">→</span></Link></li>)}
        </ul>}</div>
        <div><div className="masca-dashboard__queue-heading"><h3>Upcoming events</h3><span className="masca-dashboard__caption">Published schedule</span></div>
          {overview.upcomingEvents?.length ? <ul className="masca-dashboard__queue">
            {overview.upcomingEvents.map(event => <li key={event.id}><Link href={`/admin/collections/events/${event.id}`}>
              <time className="masca-dashboard__date" dateTime={event.startDate}><strong>{displayDate(event.startDate, event.state, 'day')}</strong><span>{displayDate(event.startDate, event.state, 'month')}</span></time>
              <span className="masca-dashboard__event-details"><strong>{event.title?.trim() || 'Untitled event'}</strong><small>{event.organisation}</small><small>{event.venue}{event.state && ` · ${event.state}`}</small></span><span aria-hidden="true">→</span>
            </Link></li>)}
          </ul> : <p className="masca-dashboard__empty">No upcoming published events.</p>}
        </div></div>
        <div className="masca-dashboard__queue-heading"><h3>Continue editing</h3><span className="masca-dashboard__caption">Recently updated drafts</span></div>
        {overview.recentDrafts?.length ? <ul className="masca-dashboard__drafts">
          {overview.recentDrafts.map(event => <li key={event.id}><Link href={`/admin/collections/events/${event.id}`}><span><strong>{event.title?.trim() || 'Untitled event'}</strong><small>{event.organisation}</small><small>{event.updatedAt ? `Edited ${displayDate(event.updatedAt)}` : 'Draft'}</small></span><span aria-hidden="true">→</span></Link></li>)}
        </ul> : <p className="masca-dashboard__empty">Your recent drafts will appear here.</p>}
      </section>
      <section aria-labelledby="manage-content">
        <div className="masca-dashboard__section-heading"><div><h2 id="manage-content">Website content</h2><p>Keep the people, images and partners behind MASCA current.</p></div></div>
        <div className="masca-dashboard__content">
          {contentAreas.map(area => <article className="masca-dashboard__content-row" key={area.name}>
            <div className="masca-dashboard__content-label"><area.Icon size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>{area.name}</h3><p>{area.description}</p></div></div>
            <div className="masca-dashboard__actions"><Link className="masca-action masca-action--quiet" href={area.href} aria-label={`Manage ${area.name.toLowerCase()}`}>Manage</Link><Link className="masca-action masca-action--secondary" href={area.createHref}>{area.action}</Link></div>
          </article>)}
        </div>
      </section>
      <footer className="masca-dashboard__content-row"><div><h3>CMS access</h3><p>Manage who can sign in.</p></div><Link className="masca-action masca-action--quiet" href="/admin/collections/users">Manage users →</Link></footer>
    </main>
  );
}
