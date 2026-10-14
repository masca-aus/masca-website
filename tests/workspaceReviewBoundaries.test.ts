import { it, expect, vi, afterEach } from "vitest";
import { configureWorkspace } from "../features/access/configureWorkspace";
import type { Field } from "payload";
import { mayDelegateMemberships } from "../features/access/committeePolicy";
afterEach(() => vi.unstubAllEnvs());
it("retains bounded account role and status select controls", () => {
  const c = configureWorkspace([{ slug: "users", fields: [] }])[0];
  const flatten = (fields: Field[]): Field[] =>
    fields.flatMap((f) => ("fields" in f ? flatten(f.fields) : [f]));
  for (const name of ["role", "status"])
    expect(
      flatten(c.fields).find((f) => "name" in f && f.name === name),
    ).toMatchObject({
      type: "select",
    });
});
it("permits only subtractive changes to expired memberships", () => {
  const old = {
    id: "m",
    committee: "QLD",
    expiresAt: "2020-01-01T00:00:00Z",
    manager: false,
    roles: { events: ["editor" as const], mediaCalendar: ["viewer" as const] },
  };
  const actor = {
    id: "1",
    email: "manager@masca.org.au",
    role: "editor",
    status: "active",
    committeeAccessReviewedAt: "2026-01-01",
    committeeMemberships: [
      {
        ...old,
        id: "manager",
        manager: true,
        roles: {},
        expiresAt: "2099-01-01T00:00:00Z",
      },
    ],
  };
  expect(
    mayDelegateMemberships(
      actor,
      [old],
      [{ ...old, roles: { mediaCalendar: ["viewer"] } }],
      "2",
    ),
  ).toBe(true);
  expect(
    mayDelegateMemberships(
      actor,
      [old],
      [{ ...old, roles: { events: ["approver"] } }],
      "2",
    ),
  ).toBe(false);
});
it("filters legacy lifecycle metadata and versions through authorised parent IDs", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "false");
  const req = {
    user: {
      id: 1,
      email: "viewer@masca.org.au",
      status: "active",
      role: "viewer",
    },
    payload: { find: vi.fn(async () => ({ docs: [{ id: 12 }] })) },
  };
  for (const slug of ["event-lifecycle", "career-lifecycle"]) {
    const c = configureWorkspace([{ slug, fields: [] }])[0],
      key = slug === "event-lifecycle" ? "event" : "career";
    expect(await c.access!.read!({ req } as never)).toEqual({
      [key]: { in: [12] },
    });
    expect(await c.access!.readVersions!({ req } as never)).toEqual({
      ["version." + key]: { in: [12] },
    });
  }
  expect(req.payload.find).toHaveBeenCalledWith(
    expect.objectContaining({ overrideAccess: false }),
  );
});
