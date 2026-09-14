import { describe, expect, it } from "vitest";

import {
  CareerSheetShapeError,
  daysBetween,
  deriveJobId,
  formatAddedLabel,
  formatClosesLabel,
  headerField,
  mapHeaders,
  melbourneToday,
  parseSheet,
  parseSheetDate,
  sanitiseApplyLink,
  sanitiseHttpUrl,
  slugify,
  sortJobs,
  splitList,
  toJob,
  type Job,
  type SheetRow,
} from "@/utils/careers";

const TODAY = "2026-09-14";
const ctx = { today: TODAY, rowNumber: 2, hasPublishedColumn: false };

const fullRow: SheetRow = {
  title: "Technology Summer Intern",
  company: "Nasi Lemak Bank",
  companyWebsite: "nasilemakbank.example",
  logoUrl: "https://cdn.example/logo.png",
  type: "Internship",
  locations: "Melbourne (hybrid), NSW",
  industry: "Banking",
  international: "Yes",
  studyLevels: "Penultimate, Final year",
  eligibility: "Any degree",
  pay: "$1,400/week",
  closes: "2026-10-05",
  added: "2026-09-11",
  apply: "https://nasilemakbank.example/apply",
  description: "12 weeks over summer.\nRotations across teams.",
  tags: "python, cloud, Python",
  featured: "TRUE",
  id: "NLB Tech Intern 2027",
};

function job(row: SheetRow, overrides: Partial<typeof ctx> = {}): Job {
  const result = toJob(row, { ...ctx, ...overrides });
  if (!("job" in result)) throw new Error(`row hidden: ${result.hidden.message}`);
  return result.job;
}

describe("header mapping", () => {
  it("matches the template headers and common synonyms regardless of case and punctuation", () => {
    expect(headerField("Apply link *")).toBe("apply");
    expect(headerField("apply_link")).toBe("apply");
    expect(headerField("Application URL")).toBe("apply");
    expect(headerField("Location(s)")).toBe("locations");
    expect(headerField("Closing date")).toBe("closes");
    expect(headerField("Deadline")).toBe("closes");
    expect(headerField("Int'l students")).toBe("international");
    expect(headerField("Working rights")).toBe("international");
    expect(headerField("Employer")).toBe("company");
    expect(headerField("Role")).toBe("title");
    expect(headerField("Owner")).toBeUndefined();
  });

  it("never maps the template's internal notes column onto the site", () => {
    expect(headerField("Notes (internal)")).toBeUndefined();
    expect(headerField("Notes")).toBeUndefined();
  });

  it("lets the first of two duplicate headers win", () => {
    expect(mapHeaders(["Title", "Link", "URL", "Company"])).toEqual([
      "title",
      "apply",
      undefined,
      "company",
    ]);
  });
});

describe("parseSheetDate", () => {
  const date = (raw: string) => parseSheetDate(raw).date;

  it("reads ISO and Australian day-first dates", () => {
    expect(date("2026-10-05")).toBe("2026-10-05");
    expect(date("2026/10/05")).toBe("2026-10-05");
    expect(date("5/10/2026")).toBe("2026-10-05");
    expect(date("05-10-2026")).toBe("2026-10-05");
    expect(date("5.10.26")).toBe("2026-10-05");
    expect(date("13/05/2026")).toBe("2026-05-13");
  });

  it("reads written months with an optional weekday, ordinal and year", () => {
    expect(date("5 Oct 2026")).toBe("2026-10-05");
    expect(date("5th October 2026")).toBe("2026-10-05");
    expect(date("Oct 5, 2026")).toBe("2026-10-05");
    expect(date("Sun 5 Oct 2026")).toBe("2026-10-05");
    expect(date("5-Oct-26")).toBe("2026-10-05");
  });

  it("refuses to guess the year for a month-day with no year", () => {
    expect(parseSheetDate("5 Oct").date).toBeUndefined();
    expect(parseSheetDate("5 Oct").warning).toContain("no year");
  });

  it("ignores a trailing time and does not treat a Sheets serial number as a date", () => {
    expect(date("2026-10-05T00:00:00")).toBe("2026-10-05");
    expect(date("5/10/2026 17:00")).toBe("2026-10-05");
    expect(parseSheetDate("46295").date).toBeUndefined();
    expect(parseSheetDate("46295").warning).toContain("couldn't read");
  });

  it("accepts a forced US month-first date with a warning", () => {
    const parsed = parseSheetDate("9/30/2026");
    expect(parsed.date).toBe("2026-09-30");
    expect(parsed.warning).toContain("US");
  });

  it("treats rolling / TBA / blank as no deadline without a warning", () => {
    for (const raw of ["Rolling", "ASAP", "TBA", "until filled", "N/A", "-", ""]) {
      expect(parseSheetDate(raw)).toEqual({ rolling: true });
    }
  });

  it("flags unreadable and impossible dates instead of throwing", () => {
    expect(parseSheetDate("end of Sept")).toMatchObject({ rolling: false });
    expect(parseSheetDate("end of Sept").warning).toContain("YYYY-MM-DD");
    expect(parseSheetDate("31/02/2026").date).toBeUndefined();
    expect(parseSheetDate("31/02/2026").warning).toContain("real date");
    expect(parseSheetDate("#N/A")).toEqual({ rolling: true });
  });
});

describe("dates and labels", () => {
  it("pins today to the Melbourne calendar day", () => {
    // 15:30 UTC on the 13th is already 01:30 on the 14th in Melbourne (AEST/AEDT).
    expect(melbourneToday(new Date("2026-09-13T15:30:00Z"))).toBe("2026-09-14");
    expect(melbourneToday(new Date("2026-09-13T13:00:00Z"))).toBe("2026-09-13");
  });

  it("counts whole days between ISO dates", () => {
    expect(daysBetween("2026-09-14", "2026-09-21")).toBe(7);
    expect(daysBetween("2026-09-14", "2026-09-13")).toBe(-1);
  });

  it("phrases added and closing labels for humans", () => {
    expect(formatAddedLabel("2026-09-14", TODAY)).toBe("Added today");
    expect(formatAddedLabel("2026-09-13", TODAY)).toBe("Added yesterday");
    expect(formatAddedLabel("2026-09-11", TODAY)).toBe("Added 3 days ago");
    expect(formatAddedLabel("2026-08-24", TODAY)).toBe("Added 3 weeks ago");
    expect(formatAddedLabel("2026-05-01", TODAY)).toBe("Added 1 May");
    expect(formatAddedLabel("2025-05-01", TODAY)).toBe("Added 1 May 2025");

    expect(formatClosesLabel({ daysLeft: 0, closesLabel: "14 Sep" })).toBe("Closes today");
    expect(formatClosesLabel({ daysLeft: 1, closesLabel: "15 Sep" })).toBe("Closes tomorrow");
    expect(formatClosesLabel({ daysLeft: 5, closesLabel: "19 Sep" })).toBe("Closes in 5 days");
    expect(formatClosesLabel({ daysLeft: 21, closesLabel: "5 Oct" })).toBe("Closes 5 Oct");
    expect(formatClosesLabel({})).toBe("Rolling applications");
  });
});

describe("links", () => {
  it("keeps http(s), upgrades bare domains, and rejects everything else", () => {
    expect(sanitiseHttpUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(sanitiseHttpUrl("http://example.com")).toBe("http://example.com/");
    expect(sanitiseHttpUrl("example.com/apply")).toBe("https://example.com/apply");
    expect(sanitiseHttpUrl("www.example.com")).toBe("https://www.example.com/");
    expect(sanitiseHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitiseHttpUrl("data:text/html,hi")).toBeUndefined();
    expect(sanitiseHttpUrl("Apply here")).toBeUndefined();
    expect(sanitiseHttpUrl("")).toBeUndefined();
    expect(sanitiseHttpUrl("http://example.com", { httpsOnly: true })).toBeUndefined();
  });

  it("turns emails into mailto links and classifies the kind", () => {
    expect(sanitiseApplyLink("jobs@example.com")).toEqual({ href: "mailto:jobs@example.com", kind: "email" });
    expect(sanitiseApplyLink("mailto:jobs@example.com")).toEqual({ href: "mailto:jobs@example.com", kind: "email" });
    expect(sanitiseApplyLink("https://example.com/apply")).toEqual({ href: "https://example.com/apply", kind: "web" });
    expect(sanitiseApplyLink("javascript:alert(1)")).toBeUndefined();
    expect(sanitiseApplyLink("Apply here")).toBeUndefined();
  });
});

describe("small helpers", () => {
  it("splits multi-value cells and dedupes case-insensitively", () => {
    expect(splitList("python, Python; SQL / cloud | data\nml.")).toEqual(["python", "SQL", "cloud", "data", "ml"]);
    expect(splitList(undefined)).toEqual([]);
  });

  it("slugifies to lowercase dashes and strips diacritics", () => {
    expect(slugify("NLB Tech Intern 2027")).toBe("nlb-tech-intern-2027");
    expect(slugify("Café Résumé!")).toBe("cafe-resume");
    expect(deriveJobId("Nasi Lemak Bank", "Technology Summer Intern")).toBe(
      "nasi-lemak-bank-technology-summer-intern",
    );
  });
});

describe("toJob", () => {
  it("maps a fully populated row", () => {
    expect(job(fullRow)).toEqual({
      id: "nlb-tech-intern-2027",
      row: 2,
      title: "Technology Summer Intern",
      company: "Nasi Lemak Bank",
      companyWebsite: "https://nasilemakbank.example/",
      logoUrl: "https://cdn.example/logo.png",
      type: "internship",
      locations: ["vic", "nsw"],
      locationNote: "Melbourne (hybrid)",
      industry: "Banking",
      industryKey: "banking",
      international: "yes",
      studyLevels: ["penultimate", "final"],
      eligibility: "Any degree",
      pay: "$1,400/week",
      closes: "2026-10-05",
      closesLabel: "5 Oct",
      daysLeft: 21,
      added: "2026-09-11",
      addedLabel: "Added 3 days ago",
      applyHref: "https://nasilemakbank.example/apply",
      applyKind: "web",
      description: "12 weeks over summer.\nRotations across teams.",
      tags: ["python", "cloud"],
      featured: true,
      isNew: true,
      isClosingSoon: false,
    });
  });

  it("derives a readable id from company and title when the sheet has none", () => {
    const { id, ...rest } = fullRow;
    void id;
    expect(job(rest).id).toBe("nasi-lemak-bank-technology-summer-intern");
  });

  it("warns when tidying an explicit ID and names the row", () => {
    const result = toJob(fullRow, ctx);
    expect(result.warnings).toEqual([
      'Row 2: ID tidied to "nlb-tech-intern-2027" (lowercase letters, numbers and dashes only)',
    ]);
  });

  it("hides rows missing a title, company or usable apply link", () => {
    expect(toJob({ ...fullRow, title: undefined }, ctx)).toMatchObject({
      hidden: { row: 2, reason: "invalid", message: "missing Title" },
    });
    expect(toJob({ ...fullRow, apply: "Apply here" }, ctx)).toMatchObject({
      hidden: { reason: "invalid", message: expect.stringContaining('"Apply here"') },
    });
    expect(toJob({ ...fullRow, apply: "javascript:alert(1)" }, ctx)).toMatchObject({
      hidden: { reason: "invalid" },
    });
  });

  it("applies Published only when the column exists, and treats a blank cell as unpublished", () => {
    const withColumn = { ...ctx, hasPublishedColumn: true };
    expect(toJob({ ...fullRow, published: "FALSE" }, withColumn)).toMatchObject({
      hidden: { reason: "unpublished" },
    });
    expect(toJob({ ...fullRow, published: undefined }, withColumn)).toMatchObject({
      hidden: { reason: "unpublished" },
    });
    expect("job" in toJob({ ...fullRow, published: "TRUE" }, withColumn)).toBe(true);
    expect("job" in toJob({ ...fullRow, published: "yes" }, withColumn)).toBe(true);
    expect("job" in toJob({ ...fullRow, published: undefined }, ctx)).toBe(true);
  });

  it("hides closed roles but keeps the closing day itself", () => {
    expect(toJob({ ...fullRow, closes: "2026-09-13" }, ctx)).toMatchObject({
      hidden: { reason: "closed", message: "closed on 13 Sep" },
    });
    const today = job({ ...fullRow, closes: "2026-09-14" });
    expect(today.daysLeft).toBe(0);
    expect(today.isClosingSoon).toBe(true);
    expect(job({ ...fullRow, closes: "2026-09-21" }).isClosingSoon).toBe(true);
    expect(job({ ...fullRow, closes: "2026-09-22" }).isClosingSoon).toBe(false);
  });

  it("keeps a role visible when its closing date is unreadable, with a warning", () => {
    const result = toJob({ ...fullRow, id: undefined, closes: "end of Sept" }, ctx);
    expect("job" in result && result.job.closes).toBeUndefined();
    expect(result.warnings[0]).toMatch(/^Row 2: Closes: couldn't read the date "end of Sept"/);
  });

  it("normalises type, international and study level aliases", () => {
    expect(job({ ...fullRow, type: "Grad program" }).type).toBe("graduate");
    expect(job({ ...fullRow, type: "clerkship" }).type).toBe("vacation");
    expect(job({ ...fullRow, type: "Full time" }).type).toBe("full-time");
    expect(job({ ...fullRow, type: "Grad Intern" }).type).toBe("other");
    expect(toJob({ ...fullRow, id: undefined, type: "Grad Intern" }, ctx).warnings).toEqual([
      'Row 2: Type "Grad Intern" isn\'t one of the options — shown as Other',
    ]);
    expect(job({ ...fullRow, type: undefined }).type).toBe("other");

    expect(job({ ...fullRow, international: "Citizens only" }).international).toBe("no");
    expect(job({ ...fullRow, international: "PR only" }).international).toBe("no");
    expect(job({ ...fullRow, international: "y" }).international).toBe("yes");
    expect(job({ ...fullRow, international: "depends" }).international).toBe("unsure");
    expect(job({ ...fullRow, international: undefined }).international).toBe("unsure");

    expect(job({ ...fullRow, studyLevels: "1st year" }).studyLevels).toEqual(["pre-penultimate"]);
    expect(job({ ...fullRow, studyLevels: "Any" }).studyLevels).toEqual(["any"]);
    expect(job({ ...fullRow, studyLevels: undefined }).studyLevels).toEqual(["any"]);
    expect(job({ ...fullRow, studyLevels: "Penultimate, Any" }).studyLevels).toEqual(["any"]);
    expect(job({ ...fullRow, studyLevels: "Masters" }).studyLevels).toEqual(["postgraduate"]);
  });

  it("maps locations to regions, keeps cities as a note, and files unknowns under Other", () => {
    expect(job({ ...fullRow, locations: "VIC/NSW/QLD" }).locations).toEqual(["vic", "nsw", "qld"]);
    expect(job({ ...fullRow, locations: "Australia wide" }).locations).toEqual(["australia"]);
    expect(job({ ...fullRow, locations: "Kuala Lumpur" })).toMatchObject({
      locations: ["malaysia"],
      locationNote: "Kuala Lumpur",
    });
    expect(job({ ...fullRow, locations: "Remote" })).toMatchObject({ locations: ["remote"], locationNote: undefined });
    const geelong = toJob({ ...fullRow, id: undefined, locations: "Geelong, Melb CBD" }, ctx);
    expect("job" in geelong && geelong.job).toMatchObject({ locations: ["vic", "other"], locationNote: "Geelong, Melb CBD" });
    expect(geelong.warnings).toEqual(['Row 2: Location "Melb CBD" isn\'t a state or one of the options — filed under Other']);
    expect(job({ ...fullRow, locations: undefined }).locations).toEqual([]);
  });

  it("drops an http logo and a bad website with warnings, keeping the row", () => {
    const result = toJob({ ...fullRow, id: undefined, logoUrl: "http://cdn.example/logo.png", companyWebsite: "not a site" }, ctx);
    expect("job" in result && result.job).toMatchObject({ logoUrl: undefined, companyWebsite: undefined });
    expect(result.warnings).toEqual([
      "Row 2: Logo URL must start with https:// — showing a monogram instead",
      'Row 2: Company website "not a site" isn\'t a web address — ignored',
    ]);
  });

  it("caps tags at eight with a warning", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`).join(", ");
    const result = toJob({ ...fullRow, id: undefined, tags }, ctx);
    expect("job" in result && result.job.tags).toHaveLength(8);
    expect(result.warnings).toEqual(["Row 2: more than 8 tags — only the first 8 are shown"]);
  });

  it("hides a rolling role once its Added date is more than 60 days old, unless it has a closing date", () => {
    const rolling = { ...fullRow, id: undefined, closes: undefined };
    expect(toJob({ ...rolling, added: "2026-07-15" }, ctx)).toMatchObject({
      hidden: { reason: "stale", message: "no closing date and Added is 61 days old — re-date Added to bring it back" },
    });
    expect("job" in toJob({ ...rolling, added: "2026-07-16" }, ctx)).toBe(true);
    expect("job" in toJob({ ...rolling, added: undefined }, ctx)).toBe(true);
    expect("job" in toJob({ ...fullRow, id: undefined, added: "2026-01-01" }, ctx)).toBe(true);
  });

  it("treats a blank Featured cell and Sheets error tokens as unset", () => {
    expect(job({ ...fullRow, featured: undefined }).featured).toBe(false);
    expect(job({ ...fullRow, featured: "FALSE" }).featured).toBe(false);
  });
});

const csv = (...lines: string[]) => lines.join("\r\n") + "\r\n";

describe("parseSheet", () => {
  const header = "Published,Featured,Title,Company,Type,Location,International students,Closes,Apply link,Added,ID,Owner";

  it("parses the template layout, numbering rows as the spreadsheet does", () => {
    const parsed = parseSheet(
      csv(
        header,
        "TRUE,FALSE,Analyst,Teh Tarik Co,Graduate,VIC,Yes,2026-10-01,https://tehtarik.example/apply,2026-09-01,,Jin",
        ",,,,,,,,,,,",
        "TRUE,TRUE,Barista,Kopi Corner,Casual,Melbourne,Yes,,jobs@kopi.example,2026-09-12,,",
        "FALSE,FALSE,Draft role,Somewhere,,,,,https://x.example,,,",
        "TRUE,FALSE,Old role,Gone Pty,,,,2026-09-01,https://x.example,,,",
        "TRUE,FALSE,,No Title Co,,,,,https://x.example,,,",
      ),
      TODAY,
    );

    expect(parsed.jobs.map((j) => [j.row, j.title])).toEqual([
      [4, "Barista"], // featured first
      [2, "Analyst"],
    ]);
    expect(parsed.hidden).toEqual([
      { row: 5, reason: "unpublished", title: "Draft role — Somewhere", message: "Published is unticked" },
      { row: 6, reason: "closed", title: "Old role — Gone Pty", message: "closed on 1 Sep" },
      { row: 7, reason: "invalid", title: "No Title Co", message: "missing Title" },
    ]);
    expect(parsed.info).toEqual(["Ignored columns (not used by the site): Owner"]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.headersFound).toContain("Apply link");
  });

  it("finds the header row beneath a banner row and reports missing optional columns", () => {
    const parsed = parseSheet(
      csv(
        "MASCA Careers Board,,",
        "Title,Company,Apply link",
        "Dev,Acme,https://acme.example",
      ),
      TODAY,
    );
    expect(parsed.jobs.map((j) => [j.row, j.title])).toEqual([[3, "Dev"]]);
    expect(parsed.info).toEqual([
      "No Published column — every row is live",
      "No Closes column — roles never expire automatically",
    ]);
  });

  it("suffixes duplicate ids so deep links stay unambiguous", () => {
    const parsed = parseSheet(
      csv("Title,Company,Apply link", "Dev,Acme,https://a.example", "Dev,Acme,https://b.example"),
      TODAY,
    );
    expect(parsed.jobs.map((j) => j.id)).toEqual(["acme-dev-2", "acme-dev"]);
    expect(parsed.warnings).toEqual(["Row 3: same company and title as an earlier row — its link is ?job=acme-dev-2"]);
  });

  it("throws a shape error naming the headers when the tab isn't a jobs tab", () => {
    expect(() => parseSheet(csv("Name,Score", "a,1"), TODAY)).toThrow(CareerSheetShapeError);
    try {
      parseSheet(csv("Title,Company", "Dev,Acme"), TODAY);
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CareerSheetShapeError);
      expect((error as CareerSheetShapeError).headersFound).toEqual(["Title", "Company"]);
      expect((error as Error).message).toContain("Apply link");
    }
    expect(() => parseSheet("", TODAY)).toThrow(/empty/);
  });
});

describe("sortJobs", () => {
  const base = job({ ...fullRow, id: undefined, featured: undefined });
  const make = (overrides: Partial<Job>): Job => ({ ...base, ...overrides });
  const featuredOld = make({ id: "f", featured: true, added: "2026-08-01", daysLeft: 40 });
  const newest = make({ id: "n", added: "2026-09-13", daysLeft: 30 });
  const closingSoon = make({ id: "c", added: "2026-09-01", daysLeft: 2 });
  const rolling = make({ id: "r", added: "2026-09-05", daysLeft: undefined, closes: undefined });
  const undated = make({ id: "u", row: 9, added: undefined, daysLeft: 10 });

  it("newest pins featured, then undated rows, then most recently added", () => {
    expect(sortJobs([closingSoon, newest, featuredOld, rolling, undated], "newest").map((j) => j.id)).toEqual([
      "f",
      "u",
      "n",
      "r",
      "c",
    ]);
  });

  it("closing puts the soonest first and rolling roles last without pinning featured", () => {
    expect(sortJobs([featuredOld, newest, closingSoon, rolling, undated], "closing").map((j) => j.id)).toEqual([
      "c",
      "u",
      "n",
      "f",
      "r",
    ]);
  });
});
