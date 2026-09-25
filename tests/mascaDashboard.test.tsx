import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardContent } from "@/components/admin/MascaDashboard";

describe("CMS dashboard overview", () => {
  it("shows count shortcuts and puts event creation in the management options", () => {
    const html = renderToStaticMarkup(<DashboardContent overview={{ pending: 2, published: 4, drafts: 3, pendingEvents: [] }} />);
    expect(html).toContain("Overview");
    expect(html).toContain("Awaiting review");
    expect(html).toContain('href="/admin/collections/events?where[_status][equals]=draft"');
    expect(html).toMatch(/<article[^>]*>[\s\S]*?<h3>Events<\/h3>[\s\S]*?href="\/admin\/collections\/events\/create"[^>]*>Create event<\/a>[\s\S]*?<\/article>/);
    for (const area of ["events", "organisations", "committee", "media", "sponsors", "users"]) {
      expect(html).toContain(`href="/admin/collections/${area}"`);
    }
  });

  it("keeps individual event lists off the overview", () => {
    const html = renderToStaticMarkup(<DashboardContent overview={{ pending: 1, published: 0, drafts: 1,
      pendingEvents: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
      recentDrafts: [{ id: 7, title: "Community dinner", organisation: "MASCA QLD" }],
    }} />);
    expect(html).not.toContain("Community dinner");
    expect(html).not.toContain("Newest submissions");
    expect(html).not.toContain("Continue editing");
    expect(html).not.toContain("Upcoming events");
    expect(html.match(/>Create event<\/a>/g)).toHaveLength(1);
  });
});
