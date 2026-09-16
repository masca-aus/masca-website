import type { Payload, PayloadRequest, Where } from "payload";

export type EventDashboardOverview = {
  pending: number;
  published: number;
  drafts: number;
  pendingEvents: { id: number | string; title: string; organisation: string }[];
};

/** The dashboard is private; thread the current CMS request through every query. */
export async function loadEventDashboard(
  payload: Pick<Payload, "count" | "find">,
  req: PayloadRequest,
): Promise<EventDashboardOverview> {
  const pendingWhere: Where = { reviewStatus: { equals: "pending" } };
  const publishedWhere: Where = {
    and: [
      { reviewStatus: { equals: "approved" } },
      { _status: { equals: "published" } },
    ],
  };
  const draftWhere: Where = {
    and: [
      { reviewStatus: { equals: "approved" } },
      { _status: { equals: "draft" } },
    ],
  };
  const shared = { collection: "events" as const, overrideAccess: false, req };

  const [pending, published, drafts, queue] = await Promise.all([
    payload.count({ ...shared, where: pendingWhere }),
    payload.count({ ...shared, where: publishedWhere }),
    payload.count({ ...shared, where: draftWhere }),
    payload.find({
      ...shared,
      where: pendingWhere,
      draft: true,
      sort: "-createdAt",
      limit: 5,
      depth: 0,
      select: { title: true, organisation: true },
    }),
  ]);

  return {
    pending: pending.totalDocs,
    published: published.totalDocs,
    drafts: drafts.totalDocs,
    pendingEvents: queue.docs.map(({ id, title, organisation }) => ({
      id,
      title,
      organisation,
    })),
  };
}
