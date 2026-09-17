import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventDate, eventTime, sameEventDay, withEventDay, withEventTime } from '@/features/events/eventDates';

afterEach(() => vi.unstubAllEnvs());
describe('event calendar dates in the existing device timezone', () => {
  it('rejects invalid stored dates', () => {
    expect(eventDate('broken')).toBeNull();
    expect(eventDate(null)).toBeNull();
  });
  it('preserves the local clock when moving a date across daylight saving', () => {
    vi.stubEnv('TZ', 'Australia/Sydney');
    const previous = new Date(2026, 8, 20, 18, 35, 12, 123);
    const next = withEventDay(new Date(2026, 11, 1), previous.toISOString());
    expect(next?.getHours()).toBe(18);
    expect(next?.getMinutes()).toBe(35);
    expect(next?.getSeconds()).toBe(12);
    expect(next?.getMilliseconds()).toBe(123);
    expect(next?.toISOString()).toBe('2026-12-01T07:35:12.123Z');
  });
  it('preserves the stored instant when reselecting a day during the repeated DST hour', () => {
    vi.stubEnv('TZ', 'Australia/Sydney');
    const repeatedHour = '2026-04-04T16:30:00.000Z';
    expect(withEventDay(new Date(2026, 3, 5), repeatedHour)?.toISOString()).toBe(repeatedHour);
  });
  it('uses a visible 9am default for a newly selected date', () => {
    expect(eventTime(withEventDay(new Date(2026, 8, 20), null))).toBe('09:00');
  });
  it('changes a time without changing its calendar day', () => {
    const date = new Date(2026, 8, 20, 9, 0);
    const changed = withEventTime(date, '20:45');
    expect(sameEventDay(date, changed)).toBe(true);
    expect(eventTime(changed)).toBe('20:45');
  });
  it('rejects nonexistent DST times rather than silently shifting the event', () => {
    vi.stubEnv('TZ', 'Australia/Sydney');
    expect(withEventTime(new Date(2026, 9, 4, 9), '02:30')).toBeNull();
    expect(withEventDay(new Date(2026, 9, 4), new Date(2026, 9, 3, 2, 30).toISOString())).toBeNull();
  });
  it('compares local days rather than UTC dates', () => {
    vi.stubEnv('TZ', 'Australia/Brisbane');
    expect(sameEventDay(new Date('2026-09-19T23:00:00Z'), new Date('2026-09-20T10:00:00Z'))).toBe(true);
    expect(sameEventDay(new Date('2026-09-20T10:00:00Z'), new Date('2026-09-20T23:00:00Z'))).toBe(false);
  });
});
