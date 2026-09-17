import { describe, expect, it, vi } from "vitest";

import { loadEventDashboard } from "@/features/events/eventDashboard";

describe("event dashboard summary", () => {
  it("counts all drafts, including pending submissions, and returns a bounded pending queue", async () => {
    const count = vi.fn().mockImplementation(async ({ where }) => {
      if (where.reviewStatus?.equals === "pending") return { totalDocs: 2 };
      if (where.and?.[1]?._status?.equals === "published") return { totalDocs: 4 };
      return { totalDocs: 1 };
    });
    const find = vi.fn().mockImplementation(async ({ where }) => ({
      totalDocs: where._status?.equals === 'draft' ? 3 : 2,
      docs: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    }));

    const req = { user: { id: 42 } };
    const result = await loadEventDashboard({ count, find } as never, req as never);
    for (const [options] of [...count.mock.calls, ...find.mock.calls]) {
      expect(options.overrideAccess).toBe(false);
      expect(options.req).toBe(req);
    }

    expect(result).toMatchObject({
      pending: 2,
      published: 4,
      drafts: 3,
      pendingEvents: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    });
    expect(count).toHaveBeenCalledTimes(1);
    expect(count.mock.calls.map(([options]) => options.where)).toEqual([
      { and: [{ reviewStatus: { equals: "approved" } }, { _status: { equals: "published" } }] },
    ]);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: "events",
      limit: 5,
      sort: "-createdAt",
      depth: 0,
      draft: true,
      where: { reviewStatus: { equals: "pending" } },
    }));
  });
});

 it("loads upcoming public events and recent drafts without exposing another request's data", async () => {
   const req = { user: { id: 42 } };
   const find = vi.fn().mockResolvedValue({ docs: [] });
   const count = vi.fn().mockResolvedValue({ totalDocs: 0 });
   const now = new Date('2026-09-17T12:00:00Z');
   const result = await loadEventDashboard({ count, find } as never, req as never, now);
   expect(result.upcomingEvents).toEqual([]);
   expect(result.recentDrafts).toEqual([]);
   expect(find).toHaveBeenCalledWith(expect.objectContaining({
     draft: false, overrideAccess: false, req, limit: 3, sort: 'startDate',
     where: { and: [
       { reviewStatus: { equals: 'approved' } }, { _status: { equals: 'published' } },
       { or: [{ startDate: { greater_than_equal: now.toISOString() } }, { endDate: { greater_than_equal: now.toISOString() } }] },
     ] },
   }));
   expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: true, req, overrideAccess: false, limit: 3, sort: '-updatedAt', where: { _status: { equals: 'draft' } } }));
 });
