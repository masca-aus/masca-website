import { describe, it, expect } from "vitest";
import {
  mayUseCalendar,
  mayApprove,
  validCalendarAccess,
} from "../../features/mediaCalendar/policy";
const member = {
  id: "1",
  email: "media@masca.org.au",
  status: "active",
  role: "editor",
  calendarAccess: {
    view: true,
    edit: true,
    approve: true,
    designation: "member",
  },
} as const;
describe("private calendar access", () => {
  it("requires explicit grants and a current MASCA account", () => {
    expect(mayUseCalendar(null, "view")).toBe(false);
    expect(mayUseCalendar({ ...member, calendarAccess: null }, "edit")).toBe(
      false,
    );
    expect(mayUseCalendar({ ...member, status: "suspended" }, "view")).toBe(
      false,
    );
    expect(
      mayUseCalendar({ ...member, email: "outsider@gmail.com" }, "view"),
    ).toBe(false);
    expect(mayUseCalendar(member, "edit")).toBe(true);
  });
  it("allows admin preview but does not invent approval membership", () => {
    expect(
      mayUseCalendar(
        { ...member, role: "administrator", calendarAccess: null },
        "edit",
      ),
    ).toBe(true);
    expect(
      mayUseCalendar(
        { ...member, role: "administrator", calendarAccess: null },
        "approve",
      ),
    ).toBe(false);
  });
  it("excludes creator and all content contributors", () => {
    const post = { creator: "2", contributors: ["2", "3"] };
    expect(mayApprove(member, post)).toBe(true);
    expect(mayApprove({ ...member, id: "2" }, post)).toBe(false);
    expect(mayApprove({ ...member, id: "3" }, post)).toBe(false);
  });
  it("requires consistent grants and member or chair for approval", () => {
    expect(
      validCalendarAccess({
        view: false,
        edit: true,
        approve: false,
        designation: null,
      }),
    ).toBe(false);
    expect(
      validCalendarAccess({
        view: true,
        edit: false,
        approve: true,
        designation: null,
      }),
    ).toBe(false);
    expect(
      validCalendarAccess({
        view: true,
        edit: false,
        approve: true,
        designation: "chair",
      }),
    ).toBe(true);
  });
});
