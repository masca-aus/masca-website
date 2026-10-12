import { afterEach, describe, expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";

vi.mock("server-only", () => ({}));

import { loadWebsiteAnalytics } from "@/features/analytics/websiteAnalytics";

const req = { user: { id: 42 } } as PayloadRequest;
const now = new Date("2026-10-08T02:12:00.000Z");

function configure() {
  vi.stubEnv("WORKSPACE_AUTH_ENABLED", "false");
  vi.stubEnv("VERCEL_ANALYTICS_TOKEN", "private-test-token");
  vi.stubEnv("VERCEL_ANALYTICS_PROJECT_ID", "prj_masca");
  vi.stubEnv("VERCEL_ANALYTICS_TEAM_ID", "team_masca");
}

function apiResponse(data: unknown) {
  return Response.json({ version: 1, query: {}, data });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("website analytics reports", () => {
  it("does not fetch metrics for unauthenticated visitors or inactive accounts", async () => {
    configure();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await loadWebsiteAnalytics({ user: null } as PayloadRequest, now)).toBeNull();
    vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
    const editor = { user: { email: "editor@masca.org.au", status: "invited", role: "editor", grants: [] } } as unknown as PayloadRequest;
    expect(await loadWebsiteAnalytics(editor, now)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows setup rather than invented zeroes when credentials are missing", async () => {
    configure();
    vi.stubEnv("VERCEL_ANALYTICS_TOKEN", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await loadWebsiteAnalytics(req, now)).toEqual({ status: "setup" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows an active workspace administrator to load the report", async () => {
    configure();
    vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
    const admin = { user: { email: "admin@masca.org.au", status: "active", role: "administrator", grants: [] } } as unknown as PayloadRequest;
    vi.stubGlobal("fetch", async (input: URL) => apiResponse(new URL(input).searchParams.get("by") === "environment" ? { visitors: 12, pageviews: 30 } : []));
    expect(await loadWebsiteAnalytics(admin, now)).toMatchObject({ status: "ready", visitors: 12, pageviews: 30 });
  });

  it("denies a suspended workspace administrator before contacting Vercel", async () => {
    configure();
    vi.stubEnv("WORKSPACE_AUTH_ENABLED", "true");
    const admin = { user: { email: "admin@masca.org.au", status: "suspended", role: "administrator", grants: [] } } as unknown as PayloadRequest;
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await loadWebsiteAnalytics(admin, now)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses a period-wide total, not summed page visitors, and sends credentials only in headers", async () => {
    configure();
    const requests: URL[] = [];
    vi.stubGlobal("fetch", async (input: URL, options: RequestInit) => {
      const url = new URL(input);
      requests.push(url);
      expect(url.origin + url.pathname).toBe("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
      expect(url.searchParams.get("projectId")).toBe("prj_masca");
      expect(url.searchParams.get("teamId")).toBe("team_masca");
      expect(url.searchParams.get("filter")).toBe("environment eq 'production'");
      expect(url.searchParams.get("since")).toBe("2026-10-01T02:00:00.000Z");
      expect(url.searchParams.get("until")).toBe("2026-10-08T01:59:59.999Z");
      expect(options.headers).toMatchObject({ Authorization: "Bearer private-test-token" });
      if (url.searchParams.get("by") === "environment") return apiResponse([{ environment: "production", visitors: 100, pageviews: 300 }]);
      if (url.searchParams.get("by") === "requestPath") return apiResponse([
        { requestPath: "/careers", visitors: 80, pageviews: 200 },
        { requestPath: "/events", visitors: 70, pageviews: 100 },
      ]);
      return apiResponse([{ referrerHostname: "", visitors: 60, pageviews: 150 }, { referrerHostname: "l.instagram.com", visitors: 40, pageviews: 90 }]);
    });
    const report = await loadWebsiteAnalytics(req, now);
    expect(report).toMatchObject({
      status: "ready", visitors: 100, pageviews: 300,
      topPages: [{ label: "/careers", pageviews: 200 }, { label: "/events", pageviews: 100 }],
      sources: [{ label: "Direct / unknown", pageviews: 150 }, { label: "l.instagram.com", pageviews: 90 }],
    });
    expect(requests).toHaveLength(4);
    expect(JSON.stringify(report)).not.toContain("private-test-token");
    expect(requests.every(url => !url.toString().includes("private-test-token"))).toBe(true);
  });

  it("accepts a single aggregate row and empty reports without making up traffic", async () => {
    configure();
    vi.stubGlobal("fetch", async (input: URL) => apiResponse(new URL(input).searchParams.get("by") === "environment" ? [{ visitors: 0, pageviews: 0 }] : []));
    expect(await loadWebsiteAnalytics(req, now)).toMatchObject({ status: "ready", visitors: 0, pageviews: 0, topPages: [], sources: [] });
  });

  it.each([
    [401, "access"], [403, "access"], [402, "plan"], [429, "rate-limit"], [500, "connection"],
  ])("handles HTTP %i without exposing the upstream response", async (status, reason) => {
    configure();
    vi.stubGlobal("fetch", async () => new Response("private upstream response", { status }));
    expect(await loadWebsiteAnalytics(req, now)).toEqual({ status: "unavailable", reason });
  });

  it("preserves totals if an optional breakdown is unavailable", async () => {
    configure();
    vi.stubGlobal("fetch", async (input: URL) => {
      const by = new URL(input).searchParams.get("by");
      if (by === "requestPath") throw new Error("timeout");
      return apiResponse(by === "environment" ? { visitors: 10, pageviews: 25 } : []);
    });
    expect(await loadWebsiteAnalytics(req, now)).toMatchObject({ status: "ready", visitors: 10, pageviews: 25, topPages: null, sources: [] });
  });

  it.each([
    { visitors: -1, pageviews: 20 },
    { visitors: "10", pageviews: 20 },
    { pageviews: 20 },
    [{ visitors: 5, pageviews: 10 }, { visitors: 5, pageviews: 10 }],
  ])("rejects malformed or grouped totals instead of misreporting visitors", async data => {
    configure();
    vi.stubGlobal("fetch", async () => apiResponse(data));
    expect(await loadWebsiteAnalytics(req, now)).toEqual({ status: "unavailable", reason: "response" });
  });
});

it.each(['active', 'suspended', 'invited'] as const)('shares site-wide metrics only with %s approved members', async status => {
  configure(); vi.stubEnv('WORKSPACE_AUTH_ENABLED', 'true');
  const member = { user: { email: 'member@masca.org.au', status, role: 'editor', grants: [], permissions: {} } } as unknown as PayloadRequest;
  vi.stubGlobal('fetch', async (input: URL) => apiResponse(new URL(input).searchParams.get('by') === 'environment' ? [{ visitors: 5, pageviews: 20 }] : []));
  const result = await loadWebsiteAnalytics(member, now);
  if (status === 'active') expect(result).toMatchObject({ status: 'ready', visitors: 5 });
  else expect(result).toBeNull();
});

it('does not share metrics with an unapproved email domain', async () => {
  configure(); vi.stubEnv('WORKSPACE_AUTH_ENABLED', 'true');
  expect(await loadWebsiteAnalytics({ user: { email: 'outside@example.org', status: 'active', role: 'editor' } } as unknown as PayloadRequest, now)).toBeNull();
});

it('loads daily traffic independently and keeps period visitors distinct', async () => {
  configure();
  vi.stubGlobal('fetch', async (input: URL) => {
    const by = new URL(input).searchParams.get('by');
    if (by === 'environment') return apiResponse({ visitors: 12, pageviews: 30 });
    if (by === 'day') return apiResponse([
      { timestamp: '2026-10-02T00:00:00Z', visitors: 10, pageviews: 20 },
      { timestamp: '2026-10-01T00:00:00Z', visitors: 8, pageviews: 10 },
    ]);
    return apiResponse([]);
  });
  expect(await loadWebsiteAnalytics(req, now)).toMatchObject({ status: 'ready', visitors: 12, daily: [
    { timestamp: '2026-10-01T00:00:00.000Z', visitors: 8, pageviews: 10 },
    { timestamp: '2026-10-02T00:00:00.000Z', visitors: 10, pageviews: 20 },
  ] });
});

it.each([null, [{ timestamp: 'bad', visitors: 1, pageviews: 2 }], [
  { timestamp: '2026-10-01T00:00:00Z', visitors: 1, pageviews: 2 },
  { timestamp: '2026-10-01T00:00:00Z', visitors: 1, pageviews: 2 },
]])('isolates missing or invalid daily reports from valid totals', async daily => {
  configure();
  vi.stubGlobal('fetch', async (input: URL) => {
    const by = new URL(input).searchParams.get('by');
    if (by === 'environment') return apiResponse({ visitors: 12, pageviews: 30 });
    if (by === 'day' && daily === null) throw Error('timeout');
    return apiResponse(by === 'day' ? daily : []);
  });
  expect(await loadWebsiteAnalytics(req, now)).toMatchObject({ status: 'ready', visitors: 12, daily: null });
});
