import { describe, expect, it } from "vitest";

import {
  EMPTY_BOARD_URL,
  EMPTY_FILTERS,
  applyFilters,
  countActiveFilters,
  countHiddenOnlyByIntl,
  getIndustryFacets,
  getLocationFacets,
  getStudyLevelFacets,
  getTypeFacets,
  hasAnyFilter,
  isValidJobId,
  matchesFilters,
  pageCount,
  pageOf,
  pageSlice,
  parseBoardUrl,
  parseFilters,
  serialiseBoardUrl,
  serialiseFilters,
  type CareerFilters,
} from "@/utils/careerFilters";
import type { Job } from "@/utils/careers";

let rowCounter = 2;
function makeJob(overrides: Partial<Job>): Job {
  const row = rowCounter++;
  return {
    id: `job-${row}`,
    row,
    title: "Software Intern",
    company: "Acme",
    type: "internship",
    locations: ["vic"],
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

// Added dates descend in this order so "newest" keeps them as listed.
const intlVic = makeJob({ id: "intl-vic", title: "Data Intern", company: "Nasi Lemak Bank", industry: "Banking", industryKey: "banking", tags: ["python"], added: "2026-09-13" });
const citizensNsw = makeJob({ id: "cit-nsw", type: "graduate", locations: ["nsw"], international: "no", industry: "banking", industryKey: "banking", studyLevels: ["final", "graduate"], added: "2026-09-12" });
const unsureRemote = makeJob({ id: "unsure-remote", type: "casual", locations: ["remote", "malaysia"], international: "unsure", industry: "Hospitality", industryKey: "hospitality", studyLevels: ["penultimate"], description: "Weekend shifts with kopi on tap", added: "2026-09-11" });
const all = [intlVic, citizensNsw, unsureRemote];

describe("URL round trip", () => {
  it("parses known values and drops unknown ones", () => {
    const params = new URLSearchParams(
      "q=%20intern%20&type=internship,ceo,Graduate&loc=vic,mars&intl=yes&level=final,any,bogus&industry=banking&sort=closing",
    );
    expect(parseFilters(params)).toEqual({
      q: "intern",
      types: ["internship", "graduate"],
      locations: ["vic"],
      intl: "yes",
      levels: ["final"],
      industries: ["banking"],
      sort: "closing",
    });
    expect(parseFilters(new URLSearchParams("intl=1&sort=up"))).toEqual(EMPTY_FILTERS);
  });

  it("serialises only non-default values, and round-trips", () => {
    expect(serialiseFilters(EMPTY_FILTERS).toString()).toBe("");
    const filters: CareerFilters = {
      q: "kopi",
      types: ["casual"],
      locations: ["remote", "malaysia"],
      intl: "maybe",
      levels: ["penultimate"],
      industries: ["hospitality"],
      sort: "closing",
    };
    const serialised = serialiseFilters(filters);
    expect(serialised.toString()).toBe(
      "q=kopi&type=casual&loc=remote%2Cmalaysia&intl=maybe&level=penultimate&industry=hospitality&sort=closing",
    );
    expect(parseFilters(serialised)).toEqual(filters);
  });

  it("carries the selected role alongside the filters, tidying the id like the sheet does", () => {
    expect(parseBoardUrl(null)).toEqual({ ...EMPTY_FILTERS, job: null, page: null, per: 10 });
    expect(parseBoardUrl(new URLSearchParams("job=acme-dev&loc=vic"))).toEqual({
      ...EMPTY_BOARD_URL,
      locations: ["vic"],
      job: "acme-dev",
    });
    // A pasted id is slugified the way the sheet slugifies ids; one with
    // nothing usable in it is dropped.
    expect(parseBoardUrl(new URLSearchParams("job=NLB%20Tech%20Intern%202027")).job).toBe("nlb-tech-intern-2027");
    expect(parseBoardUrl(new URLSearchParams("job=../x")).job).toBe("x");
    expect(parseBoardUrl(new URLSearchParams("job=%3F%3F")).job).toBeNull();
    expect(isValidJobId("nlb-tech-intern-2027")).toBe(true);
    expect(isValidJobId("Not A Slug")).toBe(false);

    expect(serialiseBoardUrl(EMPTY_BOARD_URL)).toBe("");
    expect(serialiseBoardUrl({ ...EMPTY_BOARD_URL, types: ["internship", "graduate"], job: "acme-dev" })).toBe(
      "type=internship,graduate&job=acme-dev",
    );
  });

  it("keeps the page and page size, spelling out page 1 only beside a selected role", () => {
    expect(parseBoardUrl(new URLSearchParams("page=3&per=20"))).toEqual({ ...EMPTY_BOARD_URL, page: 3, per: 20 });
    // Nonsense falls back rather than breaking the link.
    expect(parseBoardUrl(new URLSearchParams("page=0&per=7"))).toEqual(EMPTY_BOARD_URL);
    expect(parseBoardUrl(new URLSearchParams("page=abc&per=")).page).toBeNull();
    expect(parseBoardUrl(new URLSearchParams("page=123456")).page).toBeNull();

    expect(serialiseBoardUrl({ ...EMPTY_BOARD_URL, page: 1 })).toBe("");
    expect(serialiseBoardUrl({ ...EMPTY_BOARD_URL, page: 3, per: 20 })).toBe("per=20&page=3");
    // With a role selected the page is always explicit, so a shared `?job=`
    // link (no page) is the only form that derives its page from the role.
    expect(serialiseBoardUrl({ ...EMPTY_BOARD_URL, page: 1, job: "acme-dev" })).toBe("page=1&job=acme-dev");
    expect(serialiseBoardUrl({ ...EMPTY_BOARD_URL, page: null, job: "acme-dev" })).toBe("job=acme-dev");
    const state = { ...EMPTY_BOARD_URL, q: "kopi", page: 2, per: 50 as const, job: "kopi-barista" };
    expect(parseBoardUrl(new URLSearchParams(serialiseBoardUrl(state)))).toEqual(state);
  });

  it("does the page arithmetic", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageOf(0, 10)).toBe(1);
    expect(pageOf(9, 10)).toBe(1);
    expect(pageOf(10, 10)).toBe(2);
    expect(pageOf(-1, 10)).toBe(1);
    const items = Array.from({ length: 23 }, (_, i) => i);
    expect(pageSlice(items, 1, 10)).toEqual(items.slice(0, 10));
    expect(pageSlice(items, 3, 10)).toEqual([20, 21, 22]);
    expect(pageSlice(items, 4, 10)).toEqual([]);
  });

  it("counts engaged groups, ignoring search and sort", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, q: "x", sort: "closing" })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, types: ["casual"], intl: "yes" })).toBe(2);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, q: "x" })).toBe(true);
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
  });
});

describe("matching", () => {
  it("ORs within a group and ANDs across groups", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, types: ["internship", "casual"] }).map((j) => j.id)).toEqual([
      "intl-vic",
      "unsure-remote",
    ]);
    expect(applyFilters(all, { ...EMPTY_FILTERS, types: ["casual"], locations: ["vic"] })).toEqual([]);
    expect(applyFilters(all, { ...EMPTY_FILTERS, locations: ["malaysia"] }).map((j) => j.id)).toEqual(["unsure-remote"]);
  });

  it("international: yes excludes unsure roles, maybe keeps them", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, intl: "yes" }).map((j) => j.id)).toEqual(["intl-vic"]);
    expect(applyFilters(all, { ...EMPTY_FILTERS, intl: "maybe" }).map((j) => j.id)).toEqual(["intl-vic", "unsure-remote"]);
  });

  it("counts the roles that only the confirmed-international filter hides", () => {
    expect(countHiddenOnlyByIntl(all, { ...EMPTY_FILTERS, intl: "yes", types: ["casual"] })).toBe(1);
    expect(countHiddenOnlyByIntl(all, { ...EMPTY_FILTERS, intl: "yes", types: ["graduate"] })).toBe(0);
    expect(countHiddenOnlyByIntl(all, { ...EMPTY_FILTERS, intl: "off" })).toBe(0);
  });

  it("a role open to any year level matches every level pill", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, levels: ["penultimate"] }).map((j) => j.id)).toEqual([
      "intl-vic",
      "unsure-remote",
    ]);
    expect(applyFilters(all, { ...EMPTY_FILTERS, levels: ["graduate"] }).map((j) => j.id)).toEqual(["intl-vic", "cit-nsw"]);
  });

  it("industry keys merge case-insensitive spellings", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, industries: ["banking"] }).map((j) => j.id)).toEqual(["intl-vic", "cit-nsw"]);
  });

  it("search requires every term, across title, company, tags, labels and description", () => {
    expect(matchesFilters(intlVic, { ...EMPTY_FILTERS, q: "nasi python" })).toBe(true);
    expect(matchesFilters(intlVic, { ...EMPTY_FILTERS, q: "nasi sydney" })).toBe(false);
    expect(matchesFilters(citizensNsw, { ...EMPTY_FILTERS, q: "NSW graduate" })).toBe(true);
    expect(matchesFilters(unsureRemote, { ...EMPTY_FILTERS, q: "kopi" })).toBe(true);
    expect(matchesFilters(unsureRemote, { ...EMPTY_FILTERS, q: "Penultimate" })).toBe(true);
  });

  it("applies the requested sort to the filtered list", () => {
    const soon = makeJob({ id: "soon", daysLeft: 1, closes: "2026-09-15" });
    const later = makeJob({ id: "later", daysLeft: 9, closes: "2026-09-23" });
    expect(applyFilters([later, soon], { ...EMPTY_FILTERS, sort: "closing" }).map((j) => j.id)).toEqual(["soon", "later"]);
  });
});

describe("facets", () => {
  it("lists industries alphabetically with the first-seen label and merged counts", () => {
    expect(getIndustryFacets(all)).toEqual([
      { key: "banking", label: "Banking", count: 2 },
      { key: "hospitality", label: "Hospitality", count: 1 },
    ]);
  });

  it("omits empty type, location and level facets and keeps canonical order", () => {
    expect(getTypeFacets(all).map((f) => [f.key, f.count])).toEqual([
      ["internship", 1],
      ["graduate", 1],
      ["casual", 1],
    ]);
    expect(getLocationFacets(all).map((f) => [f.key, f.count])).toEqual([
      ["vic", 1],
      ["nsw", 1],
      ["remote", 1],
      ["malaysia", 1],
    ]);
    // "any" roles count toward every level; the "any" pill itself is never offered.
    expect(getStudyLevelFacets(all).map((f) => [f.key, f.count])).toEqual([
      ["pre-penultimate", 1],
      ["penultimate", 2],
      ["final", 2],
      ["graduate", 2],
      ["postgraduate", 1],
    ]);
  });
});
