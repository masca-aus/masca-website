import Link from "next/link";
import { Users, ImageIcon, Handshake, Building2, CalendarDays, Briefcase } from "lucide-react";
import "./dashboard.css";
import type { PayloadRequest } from "payload";

import { loadEventDashboard, type EventDashboardOverview } from "@/features/events/eventDashboard";

const contentAreas = [
  {
    name: "Careers",
    Icon: Briefcase,
    description: "Publish opportunities, continue drafts and manage applications.",
    href: "/admin/collections/careers",
    createHref: "/admin/collections/careers/create",
    action: "Add opportunity",
  },
  {
    name: "Events",
    Icon: CalendarDays,
    description: "Create events, continue drafts and review submissions.",
    href: "/admin/collections/events",
    createHref: "/admin/collections/events/create",
    action: "Create event",
  },
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

export function DashboardContent({ overview }: { overview: EventDashboardOverview }) {
  return (
    <main className="masca-dashboard" style={{ marginInline: "auto" }}>
      <header className="masca-dashboard__heading">
        <div><span className="masca-dashboard__eyebrow">MASCA CMS</span><h1>Your workspace</h1><p>Manage events and keep the website up to date.</p></div>
        <Link className="masca-action masca-action--quiet" href="/" target="_blank" rel="noopener noreferrer">View website ↗</Link>
      </header>
      <section aria-labelledby="events-overview">
        <div className="masca-dashboard__section-heading"><h2 id="events-overview">Overview</h2></div>
        <div className="masca-dashboard__shortcuts">
          <Link href="/admin/collections/events?where[_status][equals]=draft"><strong>{overview.drafts}</strong><span>Drafts</span><span aria-hidden="true">→</span></Link>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=pending"><strong>{overview.pending}</strong><span>Awaiting review</span><span aria-hidden="true">→</span></Link>
          <Link href="/admin/collections/events?where[reviewStatus][equals]=approved&where[_status][equals]=published"><strong>{overview.published}</strong><span>Published events</span><span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section aria-labelledby="manage-content">
        <div className="masca-dashboard__section-heading"><div><h2 id="manage-content">Manage</h2></div></div>
        <div className="masca-dashboard__content">
          {contentAreas.map(area => <article className="masca-dashboard__content-row" data-area={area.name.toLowerCase()} key={area.name}>
            <div className="masca-dashboard__content-label"><area.Icon size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>{area.name}</h3><p>{area.description}</p></div></div>
            <div className="masca-dashboard__actions"><Link className="masca-action masca-action--quiet" href={area.href} aria-label={`Manage ${area.name.toLowerCase()}`}>Manage</Link><Link className="masca-action masca-action--secondary" href={area.createHref}>{area.action}</Link></div>
          </article>)}
        </div>
      </section>
      <footer className="masca-dashboard__content-row"><div><h3>CMS access</h3><p>Manage who can sign in.</p></div><Link className="masca-action masca-action--quiet" href="/admin/collections/users">Manage users →</Link></footer>
    </main>
  );
}
