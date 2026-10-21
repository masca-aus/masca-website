import { describe, it, expect } from "vitest";
import { newPost, applyAction } from "../../features/mediaCalendar/service";
import { mayUseCalendar } from "../../features/mediaCalendar/policy";
import type { CalendarUser, Post } from "../../features/mediaCalendar/types";
const account = (scope = "QLD", role = "editor", id = "1"): CalendarUser => ({
  id,
  email: `person${id}@masca.org.au`,
  status: "active",
  role: "editor",
  accessModel: "committee",
  committeeAccessReviewedAt: "2026-01-01",
  committeeMemberships: [
    {
      id: "m",
      committee: scope as "QLD",
      roles: { mediaCalendar: [role as "editor"] },
      manager: false,
      expiresAt: "2099-01-01T00:00:00Z",
    },
  ],
  calendarAccess: {
    view: true,
    edit: true,
    approve: true,
    designation: "member",
  },
});
const post = (): Post => ({
  ...newPost({ ...account(), accessModel: "legacy" }, {}),
  owningScope: "QLD",
  sharedWith: [],
  creator: "owner",
  contributors: ["owner"],
});
describe("calendar committee isolation", () => {
  it("rejects creation outside an owned committee", () => {
    expect(() =>
      newPost(account(), { owningScope: "NSW", title: "private" }),
    ).toThrow();
    expect(newPost(account(), { owningScope: "QLD" }).owningScope).toBe("QLD");
  });
  it("rejects a cross-state edit even with broad legacy calendar rights", () => {
    expect(() =>
      applyAction(post(), account("NSW"), {
        action: "patch",
        expectedVersion: 1,
        patch: { title: "leak" },
      }),
    ).toThrow();
  });
  it("does not grant platform administrators content access", () => {
    expect(
      mayUseCalendar(
        { ...account("NSW"), role: "administrator", committeeMemberships: [] },
        "edit",
      ),
    ).toBe(false);
  });
  it("lets explicit shared editors edit content but denies workflow and deletion", () => {
    const p = post(),
      user = account("NSW");
    p.sharedWith = [{ userId: "1", role: "editor" }];
    expect(
      applyAction(p, user, {
        action: "patch",
        expectedVersion: 1,
        patch: { title: "Shared" },
      }),
    ).toBe(true);
    for (const action of [
      "draft",
      "delete",
      "restore",
      "review",
      "withdraw",
      "posted",
      "duplicate",
    ] as const)
      expect(() =>
        applyAction({ ...p }, user, {
          action,
          expectedVersion: p.version,
          expectedRevision: p.contentRevision,
        } as never),
      ).toThrow();
  });
  it("shared editor cannot change owner or collaborators", () => {
    const p = post();
    p.sharedWith = [{ userId: "1", role: "editor" }];
    expect(() =>
      applyAction(p, account("NSW"), {
        action: "patch",
        expectedVersion: 1,
        patch: { owner: "1" },
      }),
    ).toThrow();
  });
  it("expires shared access with the account membership", () => {
    const p = post();
    p.sharedWith = [{ userId: "1", role: "editor" }];
    const u = account("NSW");
    u.committeeMemberships![0].expiresAt = "2000-01-01T00:00:00Z";
    expect(() =>
      applyAction(p, u, { action: "comment", body: "hello", mentions: [] }),
    ).toThrow();
  });
});
