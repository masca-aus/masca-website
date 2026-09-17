import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardContent } from "@/components/admin/MascaDashboard";

describe("CMS dashboard actions", () => {
  it("offers creation, all drafts and the review queue directly", () => {
    const html = renderToStaticMarkup(<DashboardContent overview={{ pending: 2, published: 4, drafts: 3, pendingEvents: [] }} />);
    expect(html).toMatch(/<a[^>]*href="\/admin\/collections\/events\/create"[^>]*>[\s\S]*?Create event/);
    expect(html).toMatch(/href="\/admin\/collections\/events\?where\[_status\]\[equals\]=draft"[^>]*>[\s\S]*?Resume drafts/);
    expect(html).toContain("Review submissions");
    expect(html).toContain('style="margin-inline:auto"');
    for (const area of ["committee", "media", "sponsors", "users"]) {
      expect(html).toContain(`href="/admin/collections/${area}"`);
    }
  });

  it("shows an empty queue and links a pending submission to its editor", () => {
    const empty = renderToStaticMarkup(<DashboardContent overview={{ pending: 0, published: 0, drafts: 0, pendingEvents: [] }} />);
    expect(empty).toContain("No events awaiting review.");
    const html = renderToStaticMarkup(<DashboardContent overview={{ pending: 1, published: 0, drafts: 1, pendingEvents: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }] }} />);
    expect(html).toContain('href="/admin/collections/events/7"');
    expect(html).toContain("Community dinner");
    expect(html).not.toContain("No events awaiting review.");
  });
});

it("gives untitled drafts a usable label and renders upcoming dates and venue", () => {
 const html = renderToStaticMarkup(<DashboardContent overview={{ pending: 1, drafts: 1, published: 1,
   pendingEvents: [{ id: 8, title: '', organisation: 'MASCA', createdAt: '2026-09-17T00:00:00Z' }],
   recentDrafts: [{ id: 8, title: '', organisation: 'MASCA', updatedAt: '2026-09-17T00:00:00Z' }],
   upcomingEvents: [{ id: 9, title: 'Spring gathering', organisation: 'UQMSA', startDate: '2026-09-20T08:00:00Z', venue: 'Great Court', state: 'QLD' }],
 }} />);
 expect(html).toContain('Untitled event');
 expect(html).toContain('Continue editing');
 expect(html).toContain('Upcoming events');
 expect(html).toContain('Great Court');
 expect(html).toContain('Spring gathering');
 expect(html).toMatch(/datetime="2026-09-20T08:00:00Z"/i);
});
