/** Keep Payload's existing convention: edit in the device timezone, store ISO instants. */
export function eventDate(value: unknown): Date | null {
  if (!value || (typeof value !== 'string' && !(value instanceof Date))) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function eventTime(date: Date | null): string {
  return date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
}

export function sameEventDay(a: Date | null, b: Date | null): boolean {
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

export function withEventTime(day: Date, time: string): Date | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  // A clock time in a daylight-saving gap must not silently become a different time.
  return sameEventDay(day, date) && date.getHours() === hours && date.getMinutes() === minutes ? date : null;
}

export function withEventDay(day: Date, previous: unknown, fallbackTime = '09:00'): Date | null {
  const prior = eventDate(previous);
  if (prior && sameEventDay(day, prior)) return prior;
  const date = withEventTime(day, prior ? eventTime(prior) : fallbackTime);
  if (date && prior) date.setSeconds(prior.getSeconds(), prior.getMilliseconds());
  return date;
}
