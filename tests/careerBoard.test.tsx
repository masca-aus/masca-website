import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import robots from "../app/robots";
import sitemap from "../app/sitemap";
import BoardEmpty from "@/app/(frontend)/careers/BoardEmpty";
import CareerBoard from "@/app/(frontend)/careers/CareerBoard";
import CompanyMark, { initials } from "@/app/(frontend)/careers/CompanyMark";
import FilterModal from "@/app/(frontend)/careers/FilterModal";
import JobDetails, { descriptionBlocks, jobShareUrl } from "@/app/(frontend)/careers/JobDetails";
import Footer from "@/components/Footer";
import {
  EMPTY_FILTERS,
  getCityFacets,
  getCountryFacets,
  getIndustryFacets,
  getStateFacets,
  getStudyLevelFacets,
  getTypeFacets,
  getWorkModeFacets,
} from "@/utils/careerFilters";
import type { Job } from "@/utils/careers";
import { SITE_NAV } from "@/utils/seo";

let rowCounter = 2;
function makeJob(overrides: Partial<Job>): Job {
  const row = rowCounter++;
  return {
    id: `job-${row}`,
    row,
    title: "Software Intern",
    company: "Acme",
    type: "internship",
    country: { key: "australia", label: "Australia" },
    state: { key: "vic", label: "VIC" },
    nationwide: false,
    location: "VIC",
    international: "yes",
    studyLevels: ["any"],
    applyHref: "https://acme.example/apply",
    applyKind: "web",
    tags: [],
    featured: false,
    isNew: false,
    isClosingSoon: false,
    ...overrides,
  };
}

const featured = makeJob({
  id: "nlb-intern",
  title: "Technology Summer Intern",
  company: "Nasi Lemak Bank",
  featured: true,
  added: "2026-09-13",
  addedLabel: "Added yesterday",
  isNew: true,
  closes: "2026-09-17",
  closesLabel: "17 Sep",
  daysLeft: 3,
  isClosingSoon: true,
  industry: "Banking",
  industryKey: "banking",
  studyLevels: ["penultimate"],
  description: "Rotations across teams.\n\n- Cloud\n- Data\n<script>alert(1)</script>",
  tags: ["python"],
});
const emailJob = makeJob({
  id: "kopi-barista",
  title: "Weekend Barista",
  company: "Kopi Corner",
  type: "casual",
  city: { key: "carlton", label: "Carlton" },
  location: "Carlton, VIC",
  international: "unsure",
  applyHref: "mailto:jobs@kopi.example",
  applyKind: "email",
  added: "2026-09-10",
  addedLabel: "Added 4 days ago",
});
const citizensOnly = makeJob({
  id: "gov-grad",
  title: "Policy Graduate",
  company: "Department of Teh Tarik",
  type: "graduate",
  state: { key: "act", label: "ACT" },
  location: "ACT",
  workMode: "remote",
  international: "no",
  added: "2026-09-01",
  addedLabel: "Added 2 weeks ago",
  pay: "$75k + super",
});
const jobs = [featured, emailJob, citizensOnly];

describe("CareerBoard (static render)", () => {
  const html = renderToStaticMarkup(<CareerBoard jobs={jobs} />);

  it("lists every role and selects the first one for the desktop panel", () => {
    for (const job of jobs) expect(html).toContain(job.title);
    expect(html).toContain('aria-current="true"');
    expect(html.indexOf('data-job-id="nlb-intern"')).toBeLessThan(html.indexOf('data-job-id="kopi-barista"'));
    expect(html).toContain('id="job-detail"');
    expect(html).toContain('id="job-detail-title"');
  });

  it("renders the count, the sort and page-size controls and the international toggle unpressed", () => {
    expect(html).toContain("3 roles");
    expect(html).toContain("Open to international students");
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain("Newest first");
    expect(html).toContain("10 per page");
  });

  it("keeps the pill groups behind a closed Filters button", () => {
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("<legend");
    expect(html).not.toContain("Study level");
  });

  it("shows ten roles a page with a pager, and no pager when one page is enough", () => {
    expect(html).not.toContain('aria-label="Pages of roles"');
    const many = Array.from({ length: 12 }, (_, i) => makeJob({ id: `role-${i}`, title: `Role ${i}` }));
    const paged = renderToStaticMarkup(<CareerBoard jobs={many} />);
    expect(paged.match(/data-job-id=/g)).toHaveLength(10);
    expect(paged).toContain('aria-label="Pages of roles"');
    expect(paged).toContain("of 2");
    expect(paged).toContain("of 12");
    expect(paged).toContain('aria-label="Previous page"');
  });

  it("shows the student-facing badges on cards", () => {
    expect(html).toContain("Intl OK");
    expect(html).toContain("Closes in 3 days");
    expect(html).toContain("Featured");
    expect(html).toContain("Penultimate");
    expect(html).toContain("Rolling");
    expect(html).toContain("Carlton");
    expect(html).toContain("ACT · Remote");
  });

  it("never emits sheet text as HTML and only links to sanitised targets", () => {
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://acme.example/apply"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe("FilterModal (static render)", () => {
  it("lists every pill group with counts and the live match line", () => {
    const facets = {
      types: getTypeFacets(jobs),
      countries: getCountryFacets(jobs),
      states: getStateFacets(jobs),
      cities: getCityFacets(jobs),
      modes: getWorkModeFacets(jobs),
      levels: getStudyLevelFacets(jobs),
      industries: getIndustryFacets(jobs),
    };
    const html = renderToStaticMarkup(
      <FilterModal
        filters={{ ...EMPTY_FILTERS, types: ["casual"] }}
        facets={facets}
        visible={1}
        total={3}
        onChange={() => {}}
        onClear={() => {}}
        onClose={() => {}}
        returnFocusRef={{ current: null }}
      />,
    );
    expect(html).toContain('role="dialog"');
    for (const label of ["Working rights", "Type", "Country", "State", "City", "Work mode", "Study level", "Industry", "Internship", "Casual", "Australia", "VIC", "Carlton", "Remote", "Banking"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("1 of 3 roles");
    expect(html).toContain("Show 1 role");
    expect(html).toContain("Clear all");
    expect(html).toContain('aria-pressed="true"');
  });
});

describe("JobDetails", () => {
  it("renders an email apply link without a new tab, and the unsure callout", () => {
    const html = renderToStaticMarkup(<JobDetails job={emailJob} headingId="t" />);
    expect(html).toContain('href="mailto:jobs@kopi.example"');
    expect(html).toContain("Apply by email");
    expect(html).not.toContain('href="mailto:jobs@kopi.example" target');
    expect(html).toContain("Check working rights");
    expect(html).toContain("Rolling applications");
  });

  it("explains a citizens-only role and lists pay and locations", () => {
    const html = renderToStaticMarkup(<JobDetails job={citizensOnly} headingId="t" />);
    expect(html).toContain("Citizens / PR only");
    expect(html).toContain("Sorry lah");
    expect(html).toContain("$75k + super");
    expect(html).toContain("ACT");
    expect(html).toContain("Remote");
  });

  it("turns dash lines into a list and keeps paragraphs", () => {
    expect(descriptionBlocks("Intro line\nsecond line\n\n- one\n- two\n\nOutro")).toEqual([
      { kind: "paragraph", text: "Intro line\nsecond line" },
      { kind: "list", items: ["one", "two"] },
      { kind: "paragraph", text: "Outro" },
    ]);
    const html = renderToStaticMarkup(<JobDetails job={featured} headingId="t" />);
    expect(html).toContain("<ul");
    expect(html).toContain("<li>Cloud</li>");
  });

  it("builds a share link with the filters stripped", () => {
    expect(jobShareUrl("https://www.masca.org.au", "nlb-intern")).toBe("https://www.masca.org.au/careers?job=nlb-intern");
  });
});

describe("CompanyMark", () => {
  it("shows initials with no image when there is no logo", () => {
    expect(initials("Nasi Lemak Bank")).toBe("NL");
    expect(initials("Atlassian")).toBe("A");
    expect(initials("(Un)Named")).toBe("U");
    const html = renderToStaticMarkup(<CompanyMark name="Nasi Lemak Bank" />);
    expect(html).toContain("NL");
    expect(html).not.toContain("<img");
  });

  it("layers the logo over the initials with no referrer", () => {
    const html = renderToStaticMarkup(<CompanyMark name="Acme" logoUrl="https://cdn.example/a.png" />);
    expect(html).toContain('src="https://cdn.example/a.png"');
    expect(html).toContain('referrerPolicy="no-referrer"');
  });
});

describe("BoardEmpty", () => {
  it("keeps configuration problems out of the public copy", () => {
    const html = renderToStaticMarkup(<BoardEmpty variant="unconfigured" />);
    expect(html).toContain("still being pinned up");
    expect(html).toContain("/careers/health");
    expect(html).not.toMatch(/google|sheet id|404|status|readme/i);
  });

  it("phrases the no-match variants around what the student did", () => {
    expect(renderToStaticMarkup(<BoardEmpty variant="no-match-search" detail="quant" />)).toContain("nothing for “quant”");
    expect(renderToStaticMarkup(<BoardEmpty variant="no-match-intl" detail={2} />)).toContain("2 roles haven");
    expect(renderToStaticMarkup(<BoardEmpty variant="no-match-intl" detail={1} />)).toContain("1 role hasn");
    expect(renderToStaticMarkup(<BoardEmpty variant="none" />)).toContain("nothing on the board yet");
  });
});

describe("site wiring", () => {
  it("links /careers from the footer, sitemap and structured-data nav", () => {
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/careers"');
    expect(sitemap().map(({ url }) => new URL(url).pathname)).toContain("/careers");
    expect(SITE_NAV.map((n) => n.path)).toContain("/careers");
  });

  it("keeps the committee health report out of search engines", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.disallow).toContain("/careers/health");
  });
});
