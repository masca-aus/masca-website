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
    accent: "blue",
    icon: "people",
  },
  {
    name: "Media",
    description: "Upload and organise the images used throughout the website.",
    href: "/admin/collections/media",
    createHref: "/admin/collections/media/create",
    action: "Upload image",
    accent: "yellow",
    icon: "image",
  },
  {
    name: "Sponsors",
    description: "Keep partner names, logos and sponsorship dates up to date.",
    href: "/admin/collections/sponsors",
    createHref: "/admin/collections/sponsors/create",
    action: "Add sponsor",
    accent: "red",
    icon: "star",
  },
] as const;

export async function MascaDashboard({ initPageResult }: { initPageResult: { req: PayloadRequest } }) {
  const { req } = initPageResult;
  const overview = await loadEventDashboard(req.payload, req);
  return <DashboardContent overview={overview} />;
}

export function DashboardContent({ overview }: { overview: EventDashboardOverview }) {
  return (
    <main className="masca-dashboard masca-dashboard--workspace" style={{ marginInline: "auto" }}>
      <section className="masca-dashboard__hero">
        <div className="masca-dashboard__hero-copy">
          <span className="masca-dashboard__eyebrow">MASCA Content Management</span>
          <h1>Your content workspace.</h1>
          <p>
            Keep the national website accurate, current and useful for Malaysian
            students across Australia.
          </p>
        </div>

        <Link className="masca-dashboard__site-link" href="/" target="_blank">
          View website <ArrowIcon />
        </Link>
      </section>

      <section className="masca-dashboard__section" aria-labelledby="events-overview">
        <div className="masca-dashboard__section-heading">
          <div>
            <span className="masca-dashboard__eyebrow">Events</span>
            <h2 id="events-overview">What would you like to do?</h2>
          </div>
          <Link href="/admin/collections/events">Manage all events <ArrowIcon /></Link>
        </div>

        <div className="masca-dashboard__workflows">
          <Link href="/admin/collections/events/create" className="masca-dashboard__workflow masca-dashboard__workflow--primary">
            <span className="masca-dashboard__workflow-icon"><PlusIcon /></span>
            <h3>Create event</h3>
            <p>Start with the essentials. Save your progress and publish when ready.</p>
            <span className="masca-dashboard__workflow-action">Start a new event <ArrowIcon /></span>
          </Link>
          <Link href="/admin/collections/events?where[_status][equals]=draft" className="masca-dashboard__workflow">
            <span className="masca-dashboard__workflow-count">{overview.drafts} <small>draft{overview.drafts === 1 ? "" : "s"}</small></span>
            <h3>Resume drafts</h3>
            <p>{overview.drafts === 0 ? "No drafts yet. Create an event to get started." : "Continue an unfinished event, including drafts awaiting review."}</p>
            <span className="masca-dashboard__workflow-action">Open drafts <ArrowIcon /></span>
          </Link>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=pending" className="masca-dashboard__workflow">
            <span className="masca-dashboard__workflow-count">{overview.pending} <small>pending</small></span>
            <h3>Review submissions</h3>
            <p>{overview.pending === 0 ? "All caught up. New submissions will appear here." : "Check submitted details and decide what is ready to publish."}</p>
            <span className="masca-dashboard__workflow-action">Open review queue <ArrowIcon /></span>
          </Link>
        </div>
        <div className="masca-dashboard__publication-summary">
          <span><strong>{overview.published}</strong> published event{overview.published === 1 ? "" : "s"} visible on the website</span>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=approved&where[_status][equals]=published">View published events <ArrowIcon /></Link>
        </div>

        <div className="masca-dashboard__queue">
          <div className="masca-dashboard__queue-heading">
            <h3>Newest submissions</h3>
            <Link href="/admin/collections/events?where[reviewStatus][equals]=pending">View pending queue <ArrowIcon /></Link>
          </div>
          {overview.pendingEvents.length === 0 ? (
            <p className="masca-dashboard__queue-empty">No events awaiting review.</p>
          ) : (
            <ul>
              {overview.pendingEvents.map((event) => (
                <li key={event.id}>
                  <Link href={`/admin/collections/events/${event.id}`}>
                    <span><strong>{event.title}</strong><small>{event.organisation}</small></span>
                    <span className="masca-dashboard__pending-badge">Pending review</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="masca-dashboard__section" aria-labelledby="manage-content">
        <div className="masca-dashboard__section-heading">
          <div>
            <span className="masca-dashboard__eyebrow">Content</span>
            <h2 id="manage-content">Manage the website</h2>
          </div>
          <p>Choose an area to review existing content or add something new.</p>
        </div>

        <div className="masca-dashboard__cards">
          {contentAreas.map((area) => (
            <article
              className="masca-dashboard__card"
              data-accent={area.accent}
              key={area.name}
            >
              <div className="masca-dashboard__card-icon" aria-hidden="true">
                <AreaIcon name={area.icon} />
              </div>
              <div className="masca-dashboard__card-copy">
                <h3>{area.name}</h3>
                <p>{area.description}</p>
              </div>
              <div className="masca-dashboard__card-actions">
                <Link href={area.href}>Manage</Link>
                <Link className="masca-dashboard__add-link" href={area.createHref}>
                  <PlusIcon /> {area.action}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="masca-dashboard__admin" aria-labelledby="administration">
        <div>
          <span className="masca-dashboard__eyebrow">Administration</span>
          <h2 id="administration">CMS access</h2>
          <p>Manage the people who can sign in to this dashboard.</p>
        </div>
        <Link href="/admin/collections/users">Manage users <ArrowIcon /></Link>
      </section>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AreaIcon({ name }: { name: (typeof contentAreas)[number]["icon"] }) {
  if (name === "people") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 19c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M14 14c3.4-.7 5.6 1 6 4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  if (name === "image") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m5 18 5-5 3.5 3 2.5-2 3 4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
