import { describe, expect, it } from "vitest";
import {
  activeMemberships,
  mayAccessResource,
  mayManageCommittee,
  validMemberships,
  mayDelegateMemberships,
  type CommitteeMembership,
  type CommitteeAccount,
  type CommitteeResource,
} from "../features/access/committeePolicy";
const now = Date.parse("2026-10-13T00:00:00Z");
const membership = (
  committee = "QLD",
  roles: CommitteeMembership["roles"] = { mediaCalendar: ["editor"] },
  extra = {},
) =>
  ({
    id: committee,
    committee,
    roles,
    expiresAt: "2027-06-30T14:00:00Z",
    manager: false,
    ...extra,
  }) as CommitteeMembership;
const person = (memberships: CommitteeMembership[], extra = {}) =>
  ({
    id: "1",
    email: "test@masca.org.au",
    status: "active",
    role: "editor",
    accessModel: "committee",
    committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
    committeeMemberships: memberships,
    ...extra,
  }) as CommitteeAccount;
const record = {
  area: "mediaCalendar",
  owningScope: "QLD",
  creator: "2",
  contributors: ["2"],
  sharedWith: [],
} as CommitteeResource;
describe("committee access policy", () => {
  it("does not grant content rights to platform administrators", () => {
    expect(
      mayAccessResource(
        person([], { role: "administrator" }),
        record,
        "view",
        now,
      ),
    ).toBe(false);
  });
  it("limits area and committee even with an editor role", () => {
    const u = person([membership()]);
    expect(mayAccessResource(u, record, "edit", now)).toBe(true);
    expect(
      mayAccessResource(u, { ...record, owningScope: "NSW" }, "view", now),
    ).toBe(false);
    expect(
      mayAccessResource(u, { ...record, area: "careers" }, "view", now),
    ).toBe(false);
    expect(mayAccessResource(u, record, "publish", now)).toBe(false);
  });
  it("permits viewers to discuss but not edit", () => {
    const u = person([membership("QLD", { mediaCalendar: ["viewer"] })]);
    expect(mayAccessResource(u, record, "comment", now)).toBe(true);
    expect(mayAccessResource(u, record, "edit", now)).toBe(false);
  });
  it("requires independent approval", () => {
    const u = person([membership("QLD", { mediaCalendar: ["approver"] })]);
    expect(mayAccessResource(u, record, "approve", now)).toBe(true);
    expect(
      mayAccessResource(u, { ...record, contributors: ["1"] }, "approve", now),
    ).toBe(false);
    expect(
      mayAccessResource(u, { ...record, creator: "1" }, "publish", now),
    ).toBe(false);
  });
  it("expires access exactly at its end date", () => {
    const u = person([membership()]);
    expect(activeMemberships(u, Date.parse("2027-06-30T14:00:00Z"))).toEqual(
      [],
    );
    expect(
      mayAccessResource(u, record, "view", Date.parse("2027-06-30T14:00:00Z")),
    ).toBe(false);
  });
  it("suspension and non-MASCA accounts override memberships", () => {
    for (const patch of [{ status: "suspended" }, { email: "test@gmail.com" }])
      expect(
        mayAccessResource(person([membership()], patch), record, "view", now),
      ).toBe(false);
  });
  it("sharing grants only that record and no workflow or deletion rights", () => {
    const u = person([membership("VIC", { events: ["viewer"] })]);
    const shared: CommitteeResource = {
      ...record,
      sharedWith: [{ userId: "1", role: "editor" }],
    };
    expect(mayAccessResource(u, shared, "edit", now)).toBe(true);
    for (const action of ["approve", "publish", "delete", "share"])
      expect(mayAccessResource(u, shared, action as never, now)).toBe(false);
    expect(mayAccessResource(u, record, "view", now)).toBe(false);
  });
  it("expired members cannot continue through a share", () => {
    expect(
      mayAccessResource(
        person([membership("VIC", {}, { expiresAt: "2026-01-01T00:00:00Z" })]),
        { ...record, sharedWith: [{ userId: "1", role: "viewer" }] },
        "view",
        now,
      ),
    ).toBe(false);
  });
  it("requires valid unique memberships and dates", () => {
    expect(validMemberships([membership()])).toBe(true);
    for (const m of [
      [membership(), membership()],
      [membership("Moon")],
      [membership("QLD", {}, { expiresAt: null })],
      [membership("QLD", { mediaCalendar: ["admin"] } as never)],
    ])
      expect(validMemberships(m)).toBe(false);
  });
  it("delegates within a manager term but cannot appoint managers or change foreign memberships", () => {
    const actor = person([membership("QLD", {}, { manager: true })]);
    const nsw = membership("NSW");
    expect(mayManageCommittee(actor, "QLD", now)).toBe(true);
    expect(
      mayDelegateMemberships(actor, [nsw], [nsw, membership()], "2", now),
    ).toBe(true);
    expect(
      mayDelegateMemberships(
        actor,
        [nsw],
        [membership("NSW", { careers: ["editor"] })],
        "2",
        now,
      ),
    ).toBe(false);
    expect(
      mayDelegateMemberships(
        actor,
        [],
        [membership("QLD", {}, { manager: true })],
        "2",
        now,
      ),
    ).toBe(false);
    expect(
      mayDelegateMemberships(
        actor,
        [],
        [membership("QLD", {}, { expiresAt: "2028-01-01T00:00:00Z" })],
        "2",
        now,
      ),
    ).toBe(false);
    expect(mayDelegateMemberships(actor, [], [membership()], "1", now)).toBe(
      false,
    );
  });
  it("removing one membership preserves the others", () => {
    const actor = person([membership("QLD", {}, { manager: true })]);
    expect(
      mayDelegateMemberships(
        actor,
        [membership(), membership("VIC")],
        [membership("VIC")],
        "2",
        now,
      ),
    ).toBe(true);
  });
});
