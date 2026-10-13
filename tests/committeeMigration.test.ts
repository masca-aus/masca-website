import { expect, it } from "vitest";
import {
  legacyMembershipProposal,
  activationIssues,
  remindersDue,
} from "../features/access/committeeMigration";
it("translates explicit grants without inventing term dates or broad admin grants", () => {
  const p = legacyMembershipProposal({
    id: "1",
    email: "qld@masca.org.au",
    status: "active",
    role: "editor",
    grants: [{ area: "events", scope: "QLD" }],
    calendarAccess: {
      view: true,
      edit: true,
      approve: false,
      designation: "member",
    },
  } as never);
  expect(
    p.memberships.find((m) => m.committee === "QLD")?.roles.events,
  ).toEqual(["editor"]);
  expect(
    p.memberships.find((m) => m.committee === "National")?.roles.mediaCalendar,
  ).toEqual(["editor"]);
  expect(p.memberships.every((m) => m.expiresAt === null)).toBe(true);
  const admin = legacyMembershipProposal({
    email: "admin@masca.org.au",
    role: "administrator",
    status: "active",
  } as never);
  expect(admin.memberships).toEqual([]);
  expect(admin.reviewReasons).toContain(
    "Platform administrator had broad legacy content access.",
  );
});
it("requires reviewed valid memberships before activation", () => {
  expect(
    activationIssues([
      {
        id: "1",
        email: "a@masca.org.au",
        role: "editor",
        status: "active",
        committeeMemberships: null,
      } as never,
    ]),
  ).toHaveLength(1);
  expect(
    activationIssues([
      {
        id: "1",
        email: "a@masca.org.au",
        role: "administrator",
        status: "active",
        committeeMemberships: [],
        committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
      } as never,
    ]),
  ).toEqual([]);
});
it("returns 30 and 7 day reminders for active managers without repeated or past reminders", () => {
  const membership = {
    id: "qld",
    committee: "QLD",
    roles: {},
    manager: true,
    expiresAt: "2026-11-12T00:00:00Z",
  };
  const u = {
    id: "1",
    email: "a@masca.org.au",
    role: "editor",
    status: "active",
    committeeMemberships: [membership],
  } as never;
  const due = remindersDue([u], Date.parse("2026-10-13T12:00:00Z"));
  expect(due.map((r) => r.daysBefore)).toEqual([30]);
  expect(
    remindersDue([u], Date.parse("2026-11-05T12:00:00Z")).map(
      (r) => r.daysBefore,
    ),
  ).toEqual([7]);
  expect(remindersDue([u], Date.parse("2026-11-12T12:00:00Z"))).toEqual([]);
});
