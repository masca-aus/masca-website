import { expect, it } from "vitest";
import { calendarExport } from "../../features/mediaCalendar/calendarExport";
const post = {
  id: "post-1",
  title: "Career night",
  plannedAt: "2026-10-20T18:00:00+10:00",
};
it("keeps the publishing instant correct across timezones and links back to the private CMS", () => {
  const exported = calendarExport(post, "https://www.masca.org.au");
  const url = new URL(exported!.googleURL);
  expect(url.searchParams.get("dates")).toBe(
    "20261020T080000Z/20261020T081500Z",
  );
  expect(url.searchParams.get("ctz")).toBe("Australia/Brisbane");
  expect(url.searchParams.get("details")).toContain(
    "https://www.masca.org.au/admin/media-calendar?post=post-1",
  );
  expect(exported!.ics).toContain("DTSTART:20261020T080000Z\r\n");
  expect(exported!.ics).toContain("DTEND:20261020T081500Z\r\n");
  expect(exported!.ics).toContain("CLASS:PRIVATE");
});
it("escapes calendar property injection and folds long Unicode without splitting characters", () => {
  const exported = calendarExport(
    {
      ...post,
      title: "🌟".repeat(70) + ", hello;\\\nBEGIN:VEVENT\r\nATTENDEE:outsider",
    },
    "https://www.masca.org.au",
  );
  const lines = exported!.ics.split("\r\n");
  expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  expect(lines.some((l) => l.startsWith("ATTENDEE:"))).toBe(false);
  expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(
    true,
  );
  expect(exported!.ics.replace(/\r\n /g, "")).toContain(
    "🌟".repeat(70) + "\\, hello\\;\\\\\\nBEGIN:VEVENT\\nATTENDEE:outsider",
  );
});
it("requires a valid saved planned date and uses the latest supplied date", () => {
  expect(
    calendarExport({ ...post, plannedAt: null }, "https://www.masca.org.au"),
  ).toBeNull();
  expect(
    calendarExport(
      { ...post, plannedAt: "invalid" },
      "https://www.masca.org.au",
    ),
  ).toBeNull();
  expect(
    new URL(
      calendarExport(
        { ...post, plannedAt: "2026-10-22T08:00:00Z" },
        "https://www.masca.org.au",
      )!.googleURL,
    ).searchParams.get("dates"),
  ).toMatch(/^20261022T080000Z/);
});
