import { afterEach, describe, it, expect, vi } from "vitest";
import {
  membershipChange,
  saveMembership,
} from "../features/access/delegatedAccess";
const q = {
  id: "q",
  committee: "QLD" as const,
  roles: { events: ["editor" as const] },
  manager: false,
  expiresAt: "2099-01-01T00:00:00Z",
};
const v = { ...q, id: "v", committee: "VIC" as const };
const actor = {
  id: "1",
  email: "manager@masca.org.au",
  status: "active",
  committeeAccessReviewedAt: "2026-10-13T00:00:00Z",
  role: "editor",
  committeeMemberships: [{ ...q, manager: true }],
};
afterEach(() => {
  delete (globalThis as typeof globalThis & { committeeAccessPool?: unknown })
    .committeeAccessPool;
  vi.unstubAllEnvs();
});
describe("bounded delegation", () => {
  it("preserves other memberships when renewing or removing one", () => {
    expect(
      membershipChange(
        actor,
        [q, v],
        "QLD",
        { ...q, expiresAt: "2098-01-01T00:00:00Z" },
        "2",
      ),
    ).toContainEqual(v);
    expect(membershipChange(actor, [q, v], "QLD", null, "2")).toEqual([v]);
  });
  it("blocks self grants, manager grants, foreign changes and outliving manager", () => {
    for (const [scope, grant, id] of [
      ["QLD", q, "1"],
      ["QLD", { ...q, manager: true }, "2"],
      ["VIC", v, "2"],
      ["QLD", { ...q, expiresAt: "2100-01-01T00:00:00Z" }, "2"],
    ] as const)
      expect(() => membershipChange(actor, [q, v], scope, grant, id)).toThrow();
  });
  it("locks fresh authority, preserves foreign grants, audits and rotates sessions atomically", async () => {
    vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
    const query = vi.fn(async (sql: string) => ({
        rows: sql.includes("SELECT id,email")
          ? [
              {
                id: 1,
                email: actor.email,
                role: "editor",
                status: "active",
                committee_access_reviewed_at: actor.committeeAccessReviewedAt,
                committee_memberships: actor.committeeMemberships,
              },
              {
                id: 2,
                email: "person@masca.org.au",
                role: "editor",
                status: "active",
                committee_access_reviewed_at: actor.committeeAccessReviewedAt,
                committee_memberships: [q, v],
              },
            ]
          : [],
      })),
      release = vi.fn();
    (
      globalThis as typeof globalThis & { committeeAccessPool?: unknown }
    ).committeeAccessPool = { connect: async () => ({ query, release }) };
    await saveMembership(actor, {
      targetId: "2",
      committee: "QLD",
      membership: null,
    });
    const update = query.mock.calls.find((c) =>
      c[0].startsWith("UPDATE"),
    ) as unknown as [string, unknown[]];
    expect(update[0]).toContain("session_revision");
    expect(JSON.parse(update[1][0] as string)).toEqual([v]);
    expect(query.mock.calls[1][0]).toContain("ORDER BY id FOR UPDATE");
    expect(
      query.mock.calls.some((c) => c[0].includes("committee_access_audit")),
    ).toBe(true);
    expect(query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(release).toHaveBeenCalled();
  });
});
