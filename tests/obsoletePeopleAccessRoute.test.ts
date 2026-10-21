import { it, expect, vi, afterEach } from "vitest";
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("payload")>()),
  getPayload: async () => ({
    auth: async () => ({
      user: {
        id: 1,
        email: "admin@masca.org.au",
        role: "administrator",
        status: "active",
      },
    }),
  }),
}));
import { POST } from "../app/api/people-access/route";
afterEach(() => vi.unstubAllEnvs());
it("rejects obsolete unversioned membership writes instead of guessing fresh revisions", async () => {
  vi.stubEnv("COMMITTEE_ACCESS_ENABLED", "true");
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
  vi.stubEnv("GOOGLE_AUTH_ORIGIN", "https://cms.example");
  const r = await POST(
    new Request("https://cms.example/api/people-access", {
      method: "POST",
      headers: { origin: "https://cms.example" },
      body: JSON.stringify({
        committee: "QLD",
        targetId: "2",
        membership: null,
      }),
    }),
  );
  expect(r.status).toBe(409);
  expect((await r.json()).error).toContain("Refresh");
});
