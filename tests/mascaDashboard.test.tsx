import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardContent } from "@/components/admin/MascaDashboard";

const overview = {
  pending: 2,
  published: 4,
  drafts: 1,
  pendingEvents: [
    { id: 7, title: "Community dinner", organisation: "MASCA QLD" },
    { id: 8, title: "Student meetup", organisation: "MASCA NSW" },
  ],
};

describe("MASCA CMS dashboard", () => {
  it("centres its capped-width content in the available admin viewport", () => {
    const html = renderToStaticMarkup(<DashboardContent overview={overview} />);

    expect(html).toContain(
      '<main class="masca-dashboard" style="margin-inline:auto">',
    );
  });

  it("shows event counts and direct links to the review queue while retaining existing content areas", () => {
    const html = renderToStaticMarkup(<DashboardContent overview={overview} />);

    expect(html).toContain("Pending review");
    expect(html).toContain("Published");
    expect(html).toContain("Other drafts");
    expect(html).toContain("Community dinner");
    expect(html).toContain("/admin/collections/events/7");
    expect(html).toContain("/admin/collections/committee");
    expect(html).toContain("/admin/collections/media");
    expect(html).toContain("/admin/collections/sponsors");
  });

  it("shows a useful empty state when nothing awaits review", () => {
    const html = renderToStaticMarkup(
      <DashboardContent overview={{ ...overview, pending: 0, pendingEvents: [] }} />,
    );

    expect(html).toContain("No events awaiting review");
  });
});
