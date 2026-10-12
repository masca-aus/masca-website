import { TIMEZONE } from "./dates";

type CalendarPost = { id: string; title: string; plannedAt: string | null };
const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
// RFC 5545 limits physical lines to 75 octets, including continuation spaces.
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    size = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > 75) {
      result += "\r\n ";
      size = 1;
    }
    result += character;
    size += bytes;
  }
  return result;
}
export function calendarExport(post: CalendarPost, origin: string) {
  if (!post.plannedAt || !Number.isFinite(Date.parse(post.plannedAt)))
    return null;
  const start = new Date(post.plannedAt),
    end = new Date(start.getTime() + 15 * 60000);
  const postURL = new URL("/admin/media-calendar", origin);
  postURL.searchParams.set("post", post.id);
  const title = `MASCA · ${post.title.trim() || "Untitled post"}`;
  const description = `Planned publishing time for this MASCA post.\nOpen in the CMS: ${postURL.href}\n\nSaved copy only. Changes in the CMS will not update this calendar entry. Check the CMS for the latest date and approval status.`;
  const google = new URL("https://calendar.google.com/calendar/render");
  google.search = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(start)}/${stamp(end)}`,
    ctz: TIMEZONE,
    details: description,
  }).toString();
  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MASCA//Media Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${escapeText(post.id)}@masca.org.au`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${postURL.href}`,
      "CLASS:PRIVATE",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n";
  return { googleURL: google.href, ics };
}
