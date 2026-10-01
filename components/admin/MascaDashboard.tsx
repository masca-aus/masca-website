import { careerLifecycleIDs } from "@/features/careers/careerLifecycle";
import { DashboardTutorial } from "./DashboardTutorial";
import {
  mayManagePeople,
  mayView, mayEditArea, type PermissionArea,
  type ApprovedAccount,
} from "@/features/access/workspacePolicy";
import Link from "next/link";
import {
  Users,
  ImageIcon,
  Handshake,
  Building2,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import "./dashboard.css";
import type { PayloadRequest } from "payload";

import {
  loadEventDashboard,
  type EventDashboardOverview,
} from "@/features/events/eventDashboard";

const contentAreas = [
  {
    name: "Careers",
    group: "content",
    Icon: Briefcase,
    description:
      "Publish opportunities, continue drafts and review submissions.",
    href: "/admin/collections/careers",
    createHref: "/admin/collections/careers/create",
    action: "Add opportunity",
  },
  {
    name: "Events",
    group: "content",
    Icon: CalendarDays,
    description: "Create events, continue drafts and review submissions.",
    href: "/admin/collections/events",
    createHref: "/admin/collections/events/create",
    action: "Create event",
  },
  {
    name: "Organisations",
    group: "resources",
    Icon: Building2,
    description:
      "Keep the student organisation directory and search results up to date.",
    href: "/admin/collections/organisations",
    createHref: "/admin/collections/organisations/create",
    action: "Add organisation",
  },
  {
    name: "Committee",
    group: "content",
    Icon: Users,
    description: "Manage committee members, portraits, roles and departments.",
    href: "/admin/collections/committee",
    createHref: "/admin/collections/committee/create",
    action: "Add member",
  },
  {
    name: "Media",
    group: "resources",
    Icon: ImageIcon,
    description: "Upload and organise the images used throughout the website.",
    href: "/admin/collections/media",
    createHref: "/admin/collections/media/create",
    action: "Upload image",
  },
  {
    name: "Sponsors",
    group: "content",
    Icon: Handshake,
    description: "Keep partner names, logos and sponsorship dates up to date.",
    href: "/admin/collections/sponsors",
    createHref: "/admin/collections/sponsors/create",
    action: "Add sponsor",
  },
] as const;

export async function MascaDashboard({
  initPageResult,
}: {
  initPageResult: { req: PayloadRequest };
}) {
  const { req } = initPageResult;
  const account =
    process.env.WORKSPACE_AUTH_ENABLED === "true"
      ? (req.user as unknown as ApprovedAccount)
      : undefined;
  const showEvents =
    !account || mayView(account, "events");
  const overview = showEvents
    ? await loadEventDashboard(req.payload, req)
    : { pending: 0, published: 0, drafts: 0, pendingEvents: [] };
  const showCareers = !account || mayView(account, "careers");
  let careerPending: number | undefined;
  if (showCareers) {
    const archived = await careerLifecycleIDs(req.payload, ['archived', 'closed'], req);
    const result = await req.payload.find({ collection: 'careers', req, overrideAccess: false, draft: true, limit: 1, depth: 0, select: { title: true }, where: { id: { not_in: archived.length ? archived : [-1] }, submittedForReview: { equals: true }, _status: { equals: 'draft' } } });
    careerPending = result.totalDocs;
  }
  return <DashboardContent overview={overview} account={account} careerPending={careerPending} />;
}

export function DashboardContent({
  overview,
  account,
  careerPending,
}: {
  overview: EventDashboardOverview;
  careerPending?: number;
  account?: ApprovedAccount;
}) {
  const isAdmin = !account || mayManagePeople(account);
  const showEvents =
    !account || mayView(account, "events");
  return (
    <main className="masca-dashboard" style={{ marginInline: "auto" }}>
      <header className="masca-dashboard__heading">
        <div>
          <span className="masca-dashboard__eyebrow">MASCA CMS</span>
          <h1>Your workspace</h1>
          <p>Manage your content and keep the website up to date.</p>
        </div>
        <Link
          className="masca-action masca-action--quiet"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
        >
          View website ↗
        </Link>
      </header>
      <DashboardTutorial areas={contentAreas.filter(area => !account || mayView(account, area.href.split("/").pop() as PermissionArea)).map(area => area.name.toLowerCase())} showEvents={showEvents} isAdmin={isAdmin} />
      {showEvents && (
        <section aria-labelledby="events-overview">
          <div className="masca-dashboard__section-heading">
            <h2 id="events-overview">Events overview</h2>
          </div>
          <div className="masca-dashboard__shortcuts">
            <Link href="/admin/collections/events?where[_status][equals]=draft">
              <strong>{overview.drafts}</strong>
              <span>Drafts</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/collections/events?where[submittedForReview][equals]=true&where[_status][equals]=draft">
              <strong>{overview.pending}</strong>
              <span>Awaiting review</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/admin/collections/events?where[reviewStatus][equals]=approved&where[_status][equals]=published">
              <strong>{overview.published}</strong>
              <span>Published events</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      )}
      {careerPending !== undefined && <section aria-label="Careers review queue"><h2>Careers submissions</h2><div className="masca-dashboard__shortcuts"><Link href="/admin/collections/careers?where[submittedForReview][equals]=true&where[_status][equals]=draft"><strong>{careerPending}</strong><span>Awaiting review</span><span aria-hidden="true">→</span></Link></div></section>}
      {(
        [
          { id: "content", title: "Content" },
          { id: "resources", title: "Resources" },
        ] as const
      )
        .filter(group => contentAreas.some(area => area.group === group.id && (!account || mayView(account, area.href.split("/").pop() as PermissionArea))))
        .map((group) => (
          <section key={group.id} aria-labelledby={`manage-${group.id}`}>
            <div className="masca-dashboard__section-heading">
              <h2 id={`manage-${group.id}`}>{group.title}</h2>
            </div>
            <div className="masca-dashboard__content">
              {contentAreas
                .filter(
                  (area) =>
                    area.group === group.id &&
                    (!account || mayView(account, area.href.split("/").pop() as PermissionArea)),
                )
                .map((area) => (
                  <article
                    className="masca-dashboard__content-row"
                    data-area={area.name.toLowerCase()}
                    key={area.name}
                  >
                    <div className="masca-dashboard__content-label">
                      <area.Icon
                        size={21}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <div>
                        <h3>{area.name}</h3>
                        <p>{area.description}</p>
                      </div>
                    </div>
                    <div className="masca-dashboard__actions">
                      <Link
                        className="masca-action masca-action--quiet"
                        href={area.href}
                        aria-label={`Manage ${area.name.toLowerCase()}`}
                      >
                        {account && !mayEditArea(account, area.href.split("/").pop() as PermissionArea) ? "View only" : "Manage"}
                      </Link>
                      {(!account || mayEditArea(account, area.href.split("/").pop() as PermissionArea)) && <Link
                        className="masca-action masca-action--secondary"
                        href={area.createHref}
                      >
                        {area.action}
                      </Link>}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      {isAdmin && (
        <footer className="masca-dashboard__content-row">
          <div>
            <h3>CMS access</h3>
            <p>Manage who can sign in.</p>
          </div>
          <Link
            className="masca-action masca-action--quiet"
            href="/admin/collections/users"
          >
            People & access →
          </Link>
        </footer>
      )}
    </main>
  );
}
