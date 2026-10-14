import { it, expect } from "vitest";
import {
  parseMutation,
  mergeArea,
} from "../features/access/workspaces/mutations";
it("rejects authority fields, oversized input and unrecognised actions", () => {
  for (const value of [
    { type: "assignArea", accessCatalog: [] },
    { type: "createWorkspace", role: "administrator" },
    { type: "evil" },
    { type: "addPerson", email: "x@gmail.com", name: "X" },
  ])
    expect(() => parseMutation(value)).toThrow();
});
it("area assignment preserves every other role and exact expiry", () => {
  const m = {
    id: "m",
    committee: "ws-masa",
    roles: { mediaCalendar: ["editor" as const] },
    manager: false,
    expiresAt: "2099-01-01T12:34:56.123Z",
  };
  expect(mergeArea(m, "events", ["viewer"]).roles).toEqual({
    mediaCalendar: ["editor"],
    events: ["viewer"],
  });
  expect(mergeArea(m, "events", ["viewer"]).expiresAt).toBe(
    "2099-01-01T12:34:56.123Z",
  );
});

import { vi, afterEach } from "vitest";
import { GET, POST } from "../app/api/workspace-access/route";
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("payload")>()),
  getPayload: async () => ({ auth: async () => ({ user: null }) }),
}));
afterEach(() => vi.unstubAllEnvs());
it("rejects foreign-origin writes and unauthenticated metadata reads", async () => {
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  expect(
    (
      await POST(
        new Request("https://cms.example/api/workspace-access", {
          method: "POST",
          headers: { origin: "https://foreign.example" },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (await GET(new Request("https://cms.example/api/workspace-access"))).status,
  ).toBe(401);
});
it("bounds mutation bodies before parsing", async () => {
  expect(
    (
      await POST(
        new Request("https://cms.example/api/workspace-access", {
          method: "POST",
          headers: { origin: "https://cms.example" },
          body: "x".repeat(20001),
        }),
      )
    ).status,
  ).toBe(413);
});
it("checks the configured CMS origin when the framework uses an internal request URL", async () => {
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  vi.stubEnv("GOOGLE_AUTH_ORIGIN", "http://127.0.0.1:3207");
  const r = await POST(
    new Request("http://localhost:3207/api/workspace-access", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3207" },
      body: "{}",
    }),
  );
  expect(r.status).toBe(401);
  const foreign = await POST(
    new Request("http://localhost:3207/api/workspace-access", {
      method: "POST",
      headers: { origin: "http://localhost:3207" },
      body: "{}",
    }),
  );
  expect(foreign.status).toBe(403);
});
