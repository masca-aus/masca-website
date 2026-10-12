import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteInsights } from "@/components/admin/WebsiteInsights";

describe("website insights display", () => {
  it("hides reports when access is denied", () => {
    expect(renderToStaticMarkup(<WebsiteInsights report={null} />)).toBe("");
  });

  it("distinguishes connection failures from an empty successful report", () => {
    const failed = renderToStaticMarkup(<WebsiteInsights report={{ status: "unavailable", reason: "access" }} />);
    expect(failed).toContain("Check the Vercel connection");
    expect(failed).not.toContain('class="masca-insights__value"');
    const empty = renderToStaticMarkup(<WebsiteInsights report={{ status: "ready", since: "2026-10-01T02:10:00Z", until: "2026-10-08T02:10:00Z", visitors: 0, pageviews: 0, topPages: [], sources: [] }} />);
    expect(empty).toContain("No traffic recorded in this period");
    expect(empty).toContain("Visitors");
    expect(empty).toContain("Page views");
  });

  it("escapes analytics labels and avoids turning untrusted paths into links", () => {
    const html = renderToStaticMarkup(<WebsiteInsights report={{ status: "ready", since: "2026-10-01T02:10:00Z", until: "2026-10-08T02:10:00Z", visitors: 1200, pageviews: 3400, topPages: [{ label: "//evil.example/<script>", pageviews: 40 }], sources: null }} />);
    expect(html).toContain("1,200");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="//evil.example');
    expect(html).toContain("This breakdown is temporarily unavailable");
  });
});

it('shows the full chart and exact daily values in the Metrics view', () => {
  const html = renderToStaticMarkup(<WebsiteInsights expanded report={{ status: 'ready', since: '2026-10-01T02:00:00Z', until: '2026-10-03T02:00:00Z', visitors: 12, pageviews: 30, topPages: [], sources: null, daily: [
    { timestamp: '2026-10-01T00:00:00.000Z', visitors: 8, pageviews: 10 },
    { timestamp: '2026-10-03T00:00:00.000Z', visitors: 10, pageviews: 20 },
  ] }} />);
  expect(html).toContain('Daily page views and visitors');
  expect(html).toContain('View daily data');
  expect(html).toContain('Daily website traffic (UTC)');
  expect(html).toContain('Unavailable</td>');
  expect(html).not.toContain('Explore top pages');
  expect(html).toContain('Traffic sources');
});

it('distinguishes a zero daily report from a failed daily report', () => {
  const report = { status: 'ready' as const, since: '2026-10-01T00:00:00Z', until: '2026-10-02T00:00:00Z', visitors: 0, pageviews: 0, topPages: [], sources: [] };
  const zero = renderToStaticMarkup(<WebsiteInsights expanded report={{ ...report, daily: [{ timestamp: report.since, visitors: 0, pageviews: 0 }] }} />);
  expect(zero).toContain('Daily website traffic (UTC)');
  expect(zero).not.toContain('NaN');
  const failed = renderToStaticMarkup(<WebsiteInsights expanded report={{ ...report, daily: null }} />);
  expect(failed).toContain('daily chart is temporarily unavailable');
  expect(failed).toContain('Visitors');
});
