import { describe, expect, it, vi } from "vitest";

import { loadEventDashboard } from "@/features/events/eventDashboard";

describe("event dashboard summary", () => {
  it("counts all drafts, including pending submissions, and returns a bounded pending queue", async () => {
    const count = vi.fn().mockImplementation(async ({ where }) => {
      if (where.reviewStatus?.equals === "pending") return { totalDocs: 2 };
      if (where.and?.[1]?._status?.equals === "published") return { totalDocs: 4 };
      return { totalDocs: 1 };
    });
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    });

    const req = { user: { id: 42 } };
    const result = await loadEventDashboard({ count, find } as never, req as never);
    for (const [options] of [...count.mock.calls, ...find.mock.calls]) {
      expect(options.overrideAccess).toBe(false);
      expect(options.req).toBe(req);
    }

    expect(result).toEqual({
      pending: 2,
      published: 4,
      drafts: 1,
      pendingEvents: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    });
    expect(count).toHaveBeenCalledTimes(3);
    expect(count.mock.calls.map(([options]) => options.where)).toEqual([
      { reviewStatus: { equals: "pending" } },
      { and: [{ reviewStatus: { equals: "approved" } }, { _status: { equals: "published" } }] },
      { _status: { equals: "draft" } },
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
