import { describe, it, expect } from "vitest";
import {
  calendarDays,
  dayKey,
  moveToDay,
  localInput,
  toInstant,
} from "../../features/mediaCalendar/dates";
describe("Brisbane calendar dates", () => {
  it("starts months on Monday and includes complete weeks", () => {
    const days = calendarDays("2026-10-01", "month");
    expect(days[0]).toBe("2026-09-28");
    expect(days.at(-1)).toBe("2026-11-01");
  });
  it("preserves wall-clock time when dragging across days", () => {
    const t = "2026-10-01T23:30:00.000Z";
    expect(dayKey(t)).toBe("2026-10-02");
    const moved = moveToDay(t, "2026-10-10");
    expect(localInput(moved)).toBe("2026-10-10T09:30");
  });
  it("date picker creates the same Brisbane instant", () => {
    expect(toInstant("2026-10-10T18:00")).toBe("2026-10-10T08:00:00.000Z");
  });
});
