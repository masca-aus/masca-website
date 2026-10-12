// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { clearCalendarRecovery } from "../../features/mediaCalendar/localRecovery";
afterEach(() => localStorage.clear());
it("clears both caption recovery and deleted-post copies without removing unrelated preferences", () => {
  localStorage.setItem("masca-caption:1:post", "Private caption");
  localStorage.setItem("masca-calendar-deleted-copy:1:post", "Private deleted post");
  localStorage.setItem("theme", "light");
  clearCalendarRecovery(localStorage);
  expect(localStorage.getItem("masca-caption:1:post")).toBeNull();
  expect(localStorage.getItem("masca-calendar-deleted-copy:1:post")).toBeNull();
  expect(localStorage.getItem("theme")).toBe("light");
});
it("does not block logout when browser storage is unavailable", () => {
  expect(() => clearCalendarRecovery({ get length(): number { throw new Error("Storage denied"); } } as unknown as Storage)).not.toThrow();
});
