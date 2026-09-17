import Link from "next/link";
import "./dashboard.css";
import type { PayloadRequest } from "payload";

import { loadEventDashboard, type EventDashboardOverview } from "@/features/events/eventDashboard";

const contentAreas = [
  {
    name: "Committee",
    description: "Manage committee members, portraits, roles and departments.",
    href: "/admin/collections/committee",
    createHref: "/admin/collections/committee/create",
    action: "Add member",
  },
  {
    name: "Media",
    description: "Upload and organise the images used throughout the website.",
    href: "/admin/collections/media",
    createHref: "/admin/collections/media/create",
    action: "Upload image",
  },
  {
    name: "Sponsors",
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
        <div className="masca-dashboard__queue-heading"><h3>Newest submissions</h3><Link className="masca-action masca-action--quiet" href="/admin/collections/events">Manage all events →</Link></div>
        {overview.pendingEvents.length === 0 ? <p className="masca-dashboard__empty">No events awaiting review.</p> : <ul className="masca-dashboard__queue">
          {overview.pendingEvents.map(event => <li key={event.id}><Link href={`/admin/collections/events/${event.id}`}><span><strong>{event.title}</strong><small>{event.organisation}</small></span><span className="masca-dashboard__badge">Pending review</span><span aria-hidden="true">→</span></Link></li>)}
        </ul>}
      </section>
      <section aria-labelledby="manage-content">
        <div className="masca-dashboard__section-heading"><div><h2 id="manage-content">Website content</h2><p>Keep the people, images and partners behind MASCA current.</p></div></div>
        <div className="masca-dashboard__content">
          {contentAreas.map(area => <article className="masca-dashboard__content-row" key={area.name}>
            <div><h3>{area.name}</h3><p>{area.description}</p></div>
            <div className="masca-dashboard__actions"><Link className="masca-action masca-action--quiet" href={area.href} aria-label={`Manage ${area.name.toLowerCase()}`}>Manage</Link><Link className="masca-action masca-action--secondary" href={area.createHref}>{area.action}</Link></div>
          </article>)}
        </div>
      </section>
      <footer className="masca-dashboard__content-row"><div><h3>CMS access</h3><p>Manage who can sign in.</p></div><Link className="masca-action masca-action--quiet" href="/admin/collections/users">Manage users →</Link></footer>
    </main>
  );
}
