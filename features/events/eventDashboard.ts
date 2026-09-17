import type { Payload, PayloadRequest, Where } from "payload";

export type DashboardEvent = {
  id: number | string;
  title: string;
  organisation: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  venue?: string;
  state?: string;
};

export type EventDashboardOverview = {
  pending: number;
  published: number;
  drafts: number;
  pendingEvents: DashboardEvent[];
  recentDrafts?: DashboardEvent[];
  upcomingEvents?: DashboardEvent[];
};

/** The dashboard is private; thread the current CMS request through every query. */
export async function loadEventDashboard(
  payload: Pick<Payload, "count" | "find">,
  req: PayloadRequest,
  now = new Date(),
): Promise<EventDashboardOverview> {
  const pendingWhere: Where = { reviewStatus: { equals: "pending" } };
  const publishedWhere: Where = {
    and: [
      { reviewStatus: { equals: "approved" } },
      { _status: { equals: "published" } },
    ],
  };
  const draftWhere: Where = { _status: { equals: "draft" } };
  const shared = { collection: "events" as const, overrideAccess: false, req };

  const [published, queue, recent, upcoming] = await Promise.all([
    payload.count({ ...shared, where: publishedWhere }),
    payload.find({
      ...shared,
      where: pendingWhere,
      draft: true,
      sort: "-createdAt",
      limit: 5,
      depth: 0,
      select: { title: true, organisation: true, createdAt: true },
    }),
    payload.find({ ...shared, draft: true, where: draftWhere, sort: "-updatedAt", limit: 3, depth: 0,
      select: { title: true, organisation: true, updatedAt: true } }),
    payload.find({ ...shared, draft: false,
      where: { and: [...publishedWhere.and!, { or: [
        { startDate: { greater_than_equal: now.toISOString() } },
        { endDate: { greater_than_equal: now.toISOString() } },
      ] }] }, sort: "startDate", limit: 3, depth: 0,
      select: { title: true, organisation: true, startDate: true, venue: true, state: true } }),
  ]);

  return {
    pending: queue.totalDocs,
    published: published.totalDocs,
    drafts: recent.totalDocs,
    pendingEvents: queue.docs.map(({ id, title, organisation, createdAt }) => ({
      id,
      title,
      organisation,
      createdAt,
    })),
    recentDrafts: recent.docs.map(({ id, title, organisation, updatedAt }) => ({ id, title, organisation, updatedAt })),
    upcomingEvents: upcoming.docs.map(({ id, title, organisation, startDate, venue, state }) => ({ id, title, organisation, startDate, venue, state })),
  };
}
