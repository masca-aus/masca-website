import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CMS_EVENT_CHAPTERS, getApprovedUpcomingEvents } from "@/features/events/publicEvents";

const { find } = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({ getPayload: vi.fn(async () => ({ find })) }));
vi.mock("@payload-config", () => ({ default: {} }));

const now = new Date("2026-09-16T08:00:00.000Z");
const eventDoc = {
  id: 42,
  title: "Malaysia Night",
  organisation: "MASCA Victoria",
  description: "An evening celebrating Malaysian food, music and community.",
  startDate: "2026-10-01T08:00:00.000Z",
  endDate: "2026-10-01T11:00:00.000Z",
  venue: "Melbourne Town Hall",
  state: "VIC",
  ticketURL: "https://example.org/tickets",
  poster: { id: 7, url: "https://example.org/poster.webp", filename: "poster.webp" },
  reviewStatus: "approved",
  _status: "published",
  contactName: "Private Contact",
  contactEmail: "private@example.org",
  internalNotes: "Private review notes",
  reviewedAt: "2026-09-15T08:00:00.000Z",
  createdAt: "2026-09-14T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
};

beforeEach(() => {
  find.mockReset().mockResolvedValue({ docs: [eventDoc] });
});

afterEach(() => vi.useRealTimers());

describe("approved upcoming Payload events", () => {
  it("enforces anonymous access, publication, approval and chronological order", async () => {
    await getApprovedUpcomingEvents(now);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "events",
        overrideAccess: false,
        draft: false,
        sort: "startDate",
        pagination: false,
        depth: 1,
        where: expect.objectContaining({
          reviewStatus: { equals: "approved" },
          _status: { equals: "published" },
        }),
      }),
    );
  });

  it("includes the media filename needed to generate the populated poster URL", async () => {
    await getApprovedUpcomingEvents(now);

    expect(find.mock.calls[0][0].select).toEqual({
      title: true,
      organisation: true,
      description: true,
      startDate: true,
      endDate: true,
      venue: true,
      streetAddress: true,
      venueDetails: true,
      state: true,
      ticketURL: true,
      poster: true,
    });
    expect(find.mock.calls[0][0].populate).toEqual({ media: { filename: true, url: true } });
  });

  it("keeps events with an end date until they end, including those already started", async () => {
    await getApprovedUpcomingEvents(now);

    expect(find.mock.calls[0][0].where.or).toContainEqual({
      endDate: { greater_than_equal: "2026-09-16T08:00:00.000Z" },
    });
  });

  it("uses the start date for expiry only when there is no end date", async () => {
    await getApprovedUpcomingEvents(now);

    expect(find.mock.calls[0][0].where.or).toContainEqual({
      and: [
        { endDate: { exists: false } },
        { startDate: { greater_than_equal: "2026-09-16T08:00:00.000Z" } },
      ],
    });
    expect(find.mock.calls[0][0].where.or).toHaveLength(2);
  });

  it("uses the current instant when no date is supplied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    await getApprovedUpcomingEvents();

    expect(find.mock.calls[0][0].where.or).toContainEqual({
      endDate: { greater_than_equal: "2026-09-16T08:00:00.000Z" },
    });
  });

  it("projects the display contract without leaking fields from an overbroad response", async () => {
    const [event] = await getApprovedUpcomingEvents(now);

    expect(event).toMatchObject({
      id: "42",
      name: { text: "Malaysia Night" },
      summary: "An evening celebrating Malaysian food, music and community.",
      url: "https://example.org/tickets",
      logo: { url: "https://example.org/poster.webp" },
      venue: {
        name: "Melbourne Town Hall",
        address: { localized_address_display: "Melbourne Town Hall" },
      },
      organizer: { id: "VIC", name: "MASCA Victoria" },
      start: { local: "2026-10-01T18:00", utc: "2026-10-01T08:00:00.000Z" },
      end: { local: "2026-10-01T21:00" },
    });
    expect(Object.keys(event).sort()).toEqual([
      "end", "id", "logo", "name", "organizer", "start", "summary", "url", "venue",
    ]);
    expect(event.logo).toEqual({ url: "https://example.org/poster.webp" });
    for (const privateValue of [
      "contactName", "contactEmail", "internalNotes", "reviewedAt",
      "Private Contact", "private@example.org", "Private review notes",
    ]) {
      expect(JSON.stringify(event)).not.toContain(privateValue);
    }
  });

  it.each([
    ["VIC", "2027-01-01T00:00"],
    ["NSW", "2027-01-01T00:00"],
    ["QLD", "2026-12-31T23:00"],
    ["WA", "2026-12-31T21:00"],
    ["SA", "2026-12-31T23:30"],
    ["TAS", "2027-01-01T00:00"],
    ["ACT", "2027-01-01T00:00"],
    ["NT", "2026-12-31T22:30"],
  ])("maps %s to its local time and a matching state filter and badge", async (state, local) => {
    find.mockResolvedValue({ docs: [{
      ...eventDoc,
      state,
      startDate: "2026-12-31T13:00:00.000Z",
      endDate: null,
    }] });

    const [event] = await getApprovedUpcomingEvents(now);

    expect(event.start).toEqual({ local, utc: "2026-12-31T13:00:00.000Z" });
    expect(event.end).toEqual({ local });
    expect(event.organizer).toEqual({ id: state, name: "MASCA Victoria" });
    expect(CMS_EVENT_CHAPTERS.find((chapter) => chapter.id === event.organizer?.id))
      .toEqual({ id: state, name: state });
  });

  it("maps the end date using its own daylight-saving offset", async () => {
    find.mockResolvedValue({ docs: [{
      ...eventDoc,
      startDate: "2026-10-03T15:30:00.000Z",
      endDate: "2026-10-03T16:30:00.000Z",
    }] });

    const [event] = await getApprovedUpcomingEvents(now);

    expect(event.start.local).toBe("2026-10-04T01:30");
    expect(event.end.local).toBe("2026-10-04T03:30");
  });

  it.each([undefined, null, ""])("uses the preview contact fallback for an absent ticket URL (%j)", async (ticketURL) => {
    find.mockResolvedValue({ docs: [{ ...eventDoc, ticketURL }] });

    const [event] = await getApprovedUpcomingEvents(now);

    expect(event.url).toBe("/contact");
  });

  it.each([null, undefined, 7, "7", { id: 7 }])(
    "tolerates an absent or unpopulated poster (%j)",
    async (poster) => {
      find.mockResolvedValue({ docs: [{ ...eventDoc, poster }] });

      const [event] = await getApprovedUpcomingEvents(now);

      expect(event.logo).toBeNull();
    },
  );

  it("returns an empty calendar when there are no matching events", async () => {
    find.mockResolvedValue({ docs: [] });

    await expect(getApprovedUpcomingEvents(now)).resolves.toEqual([]);
  });

  it("propagates a calendar failure so surfaces can render their error state", async () => {
    find.mockRejectedValue(new Error("Calendar unavailable"));

    await expect(getApprovedUpcomingEvents(now)).rejects.toThrow("Calendar unavailable");
  });
});

it('passes manual address and arrival details to the public event without altering the venue name', async () => {
 find.mockResolvedValue({ docs: [{ ...eventDoc, streetAddress: '90 Swanston Street, Melbourne VIC 3000', venueDetails: 'Enter via Collins Street; level 1' }] });
 const [event] = await getApprovedUpcomingEvents(now);
 expect(event.venue).toEqual({ name: 'Melbourne Town Hall', address: { localized_address_display: '90 Swanston Street, Melbourne VIC 3000' }, details: 'Enter via Collins Street; level 1' });
});
