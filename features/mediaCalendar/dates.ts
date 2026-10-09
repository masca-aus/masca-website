export const TIMEZONE = "Australia/Brisbane";
const DAY = 86400000;
export const dayKey = (instant: string) =>
  new Date(Date.parse(instant) + 10 * 3600000).toISOString().slice(0, 10);
export const localInput = (instant: string | null) =>
  instant
    ? new Date(Date.parse(instant) + 10 * 3600000).toISOString().slice(0, 16)
    : "";
export const toInstant = (value: string) =>
  value ? new Date(`${value}:00+10:00`).toISOString() : null;
export function moveToDay(instant: string | null, day: string) {
  return toInstant(
    `${day}T${instant ? localInput(instant).slice(11) : "18:00"}`,
  )!;
}
export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY)
    .toISOString()
    .slice(0, 10);
}
export function calendarDays(day: string, view: "month" | "week" | "list") {
  const base = view === "week" ? day : `${day.slice(0, 7)}-01`,
    date = new Date(`${base}T12:00:00Z`),
    start = addDays(base, -((date.getUTCDay() + 6) % 7));
  if (view === "week")
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12),
    )
      .toISOString()
      .slice(0, 10),
    last = addDays(
      end,
      6 - ((new Date(`${end}T12:00:00Z`).getUTCDay() + 6) % 7),
    );
  return Array.from(
    { length: Math.round((Date.parse(last) - Date.parse(start)) / DAY) + 1 },
    (_, i) => addDays(start, i),
  );
}
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
