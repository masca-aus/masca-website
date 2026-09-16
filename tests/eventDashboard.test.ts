import { describe, expect, it, vi } from "vitest";

import { loadEventDashboard } from "@/features/events/eventDashboard";

describe("event dashboard summary", () => {
  it("counts mutually exclusive review states and returns only the newest pending events", async () => {
    const count = vi.fn().mockImplementation(async ({ where }) => {
      if (where.reviewStatus?.equals === "pending") return { totalDocs: 2 };
      if (where.and?.[1]?._status?.equals === "published") return { totalDocs: 4 };
      return { totalDocs: 1 };
    });
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    });

    const result = await loadEventDashboard({ count, find } as never, {} as never);

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
      { and: [{ reviewStatus: { equals: "approved" } }, { _status: { equals: "draft" } }] },
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
