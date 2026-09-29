import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EventPage from "@/app/(frontend)/events/page";
import EventShowcaseSection from "@/app/(frontend)/sections/eventShowcase";
import UpcomingEvent from "@/app/(frontend)/sections/upcomingEvent";
import type { Event } from "@/utils/events";

const { getApprovedUpcomingEvents } = vi.hoisted(() => ({
  getApprovedUpcomingEvents: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@/features/events/publicEvents", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/events/publicEvents")>(),
  getApprovedUpcomingEvents,
}));
// Keep the rollback source unavailable without making external calendar requests.
vi.mock("@/utils/events", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/utils/events")>(),
  tryGetUpcomingEvents: async () => [],
}));

const event: Event = {
  id: "42",
  name: { text: "CMS Malaysia Night" },
  start: { local: "2026-10-01T18:00", utc: "2026-10-01T08:00:00.000Z" },
  end: { local: "2026-10-01T21:00" },
  url: "https://example.org/tickets",
  summary: "An evening celebrating Malaysian food, music and community.",
  logo: { url: "https://example.org/poster.webp" },
  venue: {
    name: "Brisbane City Hall",
    address: { localized_address_display: "Brisbane City Hall" },
  },
  organizer: { id: "QLD", name: "MASCA Queensland" },
};

beforeEach(() => {
  getApprovedUpcomingEvents.mockReset().mockResolvedValue([event]);
});

describe("public Payload event surfaces", () => {
  it("renders approved CMS events in the existing Events page with state badges and filters", async () => {
    const html = renderToStaticMarkup(await EventPage());

    expect(html).toContain("CMS Malaysia Night");
    expect(html).toContain('aria-label="QLD chapter"');
    expect(html).toContain("Brisbane City Hall · 6pm – 9pm");
    expect(html).toContain('src="https://example.org/poster.webp"');
    expect(html).toContain('href="https://example.org/tickets"');
    for (const state of ["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"]) {
      expect(html).toMatch(new RegExp(`<button[^>]*>${state}</button>`));
    }
  });

  it("links the event hosting action to the event submission form", async () => {
    const html = renderToStaticMarkup(await EventPage());

    expect(html).toMatch(/<a[^>]*href="\/submit\/event"[^>]*>Tell us about it/);
  });

  it("renders a friendly empty calendar with an event submission action", async () => {
    getApprovedUpcomingEvents.mockResolvedValue([]);

    const html = renderToStaticMarkup(await EventPage());

    expect(html).toContain("nothing on the calendar yet");
    expect(html).toContain("Check back soon");
    expect(html).toContain('href="/submit/event"');
  });

  it("renders a friendly unavailable calendar without exposing service errors", async () => {
    getApprovedUpcomingEvents.mockRejectedValue(new Error("Private database connection error"));

    const html = renderToStaticMarkup(await EventPage());

    expect(html).toContain("the calendar took a teh tarik break");
    expect(html).toContain("Give it a minute and try again");
    expect(html).not.toContain("Private database connection error");
  });

  it("renders the first approved CMS event in the homepage upcoming card", async () => {
    getApprovedUpcomingEvents.mockResolvedValue([
      event,
      { ...event, id: "43", name: { text: "Later CMS event" } },
    ]);

    const html = renderToStaticMarkup(await UpcomingEvent());

    expect(html).toContain("CMS Malaysia Night");
    expect(html).toContain("Brisbane City Hall");
    expect(html).toContain("1 October 2026");
    expect(html).toContain("Hosted by MASCA Queensland");
    expect(html).toContain('href="https://example.org/tickets"');
    expect(html).not.toContain("Later CMS event");
  });

  it.each(["empty", "unavailable"])("omits the homepage upcoming card when the calendar is %s", async (state) => {
    if (state === "empty") getApprovedUpcomingEvents.mockResolvedValue([]);
    else getApprovedUpcomingEvents.mockRejectedValue(new Error("Calendar unavailable"));

    expect(renderToStaticMarkup(await UpcomingEvent())).toBe("");
  });

  it("renders up to three approved CMS events through the existing homepage showcase grid", async () => {
    getApprovedUpcomingEvents.mockResolvedValue([
      event,
      { ...event, id: "43", name: { text: "Second CMS event" } },
      { ...event, id: "44", name: { text: "Third CMS event" } },
      { ...event, id: "45", name: { text: "Fourth CMS event" } },
    ]);

    const html = renderToStaticMarkup(await EventShowcaseSection());

    expect(html).toContain("CMS Malaysia Night");
    expect(html).toContain("Second CMS event");
    expect(html).toContain("Third CMS event");
    expect(html).not.toContain("Fourth CMS event");
    expect(html).toContain('aria-label="QLD chapter"');
    expect(html).toContain('href="/events"');
  });

  it.each(["empty", "unavailable"])("renders a friendly homepage showcase when the calendar is %s", async (state) => {
    if (state === "empty") getApprovedUpcomingEvents.mockResolvedValue([]);
    else getApprovedUpcomingEvents.mockRejectedValue(new Error("Private calendar error"));

    const html = renderToStaticMarkup(await EventShowcaseSection());

    expect(html).toContain("No upcoming events right now — check back soon!");
    expect(html).not.toContain("Private calendar error");
  });

  it("allows both routes to age events out within a minute without an admin edit", async () => {
    const routes = await Promise.all([
      import("@/app/(frontend)/events/page"),
      import("@/app/(frontend)/page"),
    ]);

    for (const route of routes) {
      expect(route).toHaveProperty("revalidate", expect.any(Number));
      expect((route as { revalidate: number }).revalidate).toBeGreaterThan(0);
      expect((route as { revalidate: number }).revalidate).toBeLessThanOrEqual(60);
    }
  });
});
