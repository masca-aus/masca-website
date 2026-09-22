import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import { Events } from "@/collections/Events";
import { EVENT_STATES } from "@/features/events/eventSubmission";

const getEventsCollection = async () => {
  const { default: configPromise } = await import("@payload-config");
  const config = await configPromise;
  const events = config.collections.find(
    (collection) => String(collection.slug) === "events",
  );
  if (!events) throw new Error("events collection not found");
  return events;
};

const getField = async (name: string) => {
  const events = await getEventsCollection();
  const field = events.fields.find(
    (candidate) => "name" in candidate && candidate.name === name,
  );
  if (!field) throw new Error(`field ${name} not found`);
  return field;
};

describe("events collection", () => {
  it("keeps drafts without autosave and retains version history", () => {
    expect(Events.versions).toMatchObject({ drafts: true, maxPerDoc: 0 });
    expect(Events.lockDocuments).toBe(false);
  });

  it("calls event versions Change history while keeping the history available", () => {
    expect(Events.versions).toMatchObject({ drafts: true, maxPerDoc: 0 });
    expect(Events.admin?.components?.views?.edit?.versions?.tab?.label).toBe(
      "Change history",
    );
  });

  it("hides the developer API view from event editors", () => {
    expect(Events.admin?.hideAPIURL).toBe(true);
  });

  it("uses Change history in Payload's built-in history heading and breadcrumb", async () => {
    const { default: configPromise } = await import("@payload-config");
    const config = await configPromise;

    expect(config.i18n?.translations?.en?.version?.versions).toBe(
      "Change history",
    );
  });

  it("is registered with the moderation columns editors need", async () => {
    const events = await getEventsCollection();

    expect(events.admin?.useAsTitle).toBe("title");
    expect(events.admin?.defaultColumns).toEqual([
      "title",
      "organisation",
      "startDate",
      "cmsStatus",
    ]);
  });

  it("normalizes draft settings without enabling autosave", async () => {
    const events = await getEventsCollection();

    expect(events.versions).toMatchObject({
      drafts: { autosave: false },
      maxPerDoc: 0,
    });
    expect(events.lockDocuments).toBe(false);
  });

  it("defaults new submissions to pending review", async () => {
    const reviewStatus = await getField("reviewStatus");

    expect(reviewStatus.type).toBe("select");
    expect("defaultValue" in reviewStatus && reviewStatus.defaultValue).toBe("pending");
    expect("options" in reviewStatus && reviewStatus.options).toEqual([
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ]);
  });

  it("puts the final review decision last and gives it an editor-facing treatment", async () => {
    const events = await getEventsCollection();
    const reviewStatus = await getField("reviewStatus");
    const fieldNames = events.fields.flatMap((field) =>
      "name" in field && typeof field.name === "string" ? [field.name] : [],
    );

    expect(fieldNames.indexOf("reviewStatus")).toBeGreaterThan(fieldNames.indexOf("reviewedAt"));
    expect("admin" in reviewStatus && reviewStatus.admin).toMatchObject({
      className: expect.stringContaining("masca-event-review-decision"),
      description: "Publishing automatically approves this event. Choose Rejected to keep a submission off the website.",
      components: {
        Cell: "/components/admin/EventStatusCell#EventReviewStatusCell",
      },
    });
  });

  it("allows authenticated CMS users to fully manage events", async () => {
    const events = await getEventsCollection();
    const authenticated = { req: { user: { id: 1 }, payload: { find: async () => ({ docs: [{ id: 2, event: 7, status: 'archived' }] }) } } } as never;

    expect(await events.access.read(authenticated)).toBe(true);
    expect(events.access.create?.(authenticated)).toBe(true);
    expect(events.access.update?.(authenticated)).toBe(true);
    expect(await events.access.delete?.(authenticated)).toBe(true);
  });

  it("limits anonymous reads to events that are both approved and published", async () => {
    const events = await getEventsCollection();

    expect(await events.access.read({ req: { user: null, payload: { find: async () => ({ docs: [] }) } } } as never)).toEqual({
      and: [
        { id: { not_in: [-1] } },
        { reviewStatus: { equals: "approved" } },
        { _status: { equals: "published" } },
      ],
    });
    expect(events.access.create?.({ req: { user: null } } as never)).toBe(false);
    expect(events.access.update?.({ req: { user: null } } as never)).toBe(false);
    expect(await events.access.delete?.({ req: { user: null } } as never)).toBe(false);
  });

  it("denies anonymous reads of submitter and review-only fields", async () => {
    for (const name of [
      "contactName",
      "contactEmail",
      "internalNotes",
      "reviewedAt",
    ]) {
      const field = await getField(name);
      if (!("access" in field) || typeof field.access?.read !== "function") {
        throw new Error(`${name} has no field read access function`);
      }

      expect(field.access.read({ req: { user: null } } as never), name).toBe(false);
      expect(field.access.read({ req: { user: { id: 1 } } } as never), name).toBe(true);
    }
  });

  it("uses shared state options and relates an optional poster to Media", async () => {
    const state = await getField("state");
    expect(state.type).toBe("select");
    expect("options" in state && state.options).toEqual(EVENT_STATES);

    const poster = await getField("poster");
    expect(poster.type).toBe("upload");
    expect("relationTo" in poster && poster.relationTo).toBe("media");
    expect("required" in poster && poster.required).toBeFalsy();
  });

  it("revalidates the Events page and homepage on change and delete", async () => {
    const events = await getEventsCollection();
    const afterChange = events.hooks?.afterChange ?? [];
    const afterDelete = events.hooks?.afterDelete ?? [];
    expect(afterChange.length).toBeGreaterThan(0);
    expect(afterDelete.length).toBeGreaterThan(0);

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterChange) await hook({ doc: { _status: "published" }, req: { query: {} } } as never);
    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
      "/events",
      "/",
    ]);

    vi.mocked(revalidatePath).mockClear();
    for (const hook of afterDelete) await hook({} as never);
    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
      "/events",
      "/",
    ]);
  });
});
