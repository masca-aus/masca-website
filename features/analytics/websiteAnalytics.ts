import "server-only";
import type { PayloadRequest } from "payload";
import { z } from "zod";
import { isWorkspaceEmail, type ApprovedAccount } from "@/features/access/workspacePolicy";

export type DailyTraffic = { timestamp: string; visitors: number; pageviews: number };
export type AnalyticsBreakdown = { label: string; pageviews: number };
export type WebsiteAnalyticsReport =
  | { status: "setup" }
  | { status: "unavailable"; reason: "access" | "plan" | "rate-limit" | "connection" | "response" }
  | {
      status: "ready";
      since: string;
      until: string;
      visitors: number;
      pageviews: number;
      topPages: AnalyticsBreakdown[] | null;
      sources: AnalyticsBreakdown[] | null;
      daily?: DailyTraffic[] | null;
    };

const metric = z.object({
  visitors: z.number().int().nonnegative(),
  pageviews: z.number().int().nonnegative(),
});
const dailyResponse = z.object({ data: z.array(metric.extend({ timestamp: z.string().datetime({ offset: true }) })).max(31) });
const totalsResponse = z.object({ data: z.union([metric, z.array(metric).max(1)]) });
const breakdownResponse = z.object({ data: z.array(metric.extend({
  requestPath: z.string().nullable().optional(),
  referrerHostname: z.string().nullable().optional(),
})) });

class AnalyticsError extends Error {
  constructor(readonly reason: Extract<WebsiteAnalyticsReport, { status: "unavailable" }>["reason"]) {
    super("Website analytics unavailable");
  }
}

/** Only called from the authenticated CMS server tree; never expose the token in props. */
export async function loadWebsiteAnalytics(
  req: Pick<PayloadRequest, "user">,
  now = new Date(),
): Promise<WebsiteAnalyticsReport | null> {
  if (!req.user) return null;
  if (process.env.WORKSPACE_AUTH_ENABLED === "true") {
    const account = req.user as unknown as ApprovedAccount;
    if (account.status !== "active" || !isWorkspaceEmail(account.email)) return null;
  }

  const token = process.env.VERCEL_ANALYTICS_TOKEN?.trim();
  const projectId = (process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID)?.trim();
  const teamId = (process.env.VERCEL_ANALYTICS_TEAM_ID || process.env.VERCEL_TEAM_ID)?.trim();
  if (!token || !projectId) return { status: "setup" };

  // Vercel rounds aggregates to hours. Query the last seven complete days of hours,
  // with an inclusive end just before the boundary, so the UI range matches the API.
  const until = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  const inclusiveUntil = new Date(Date.parse(until) - 1).toISOString();
  const since = new Date(Date.parse(until) - 7 * 86_400_000).toISOString();
  async function query(by: string) {
    const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
    url.search = new URLSearchParams({ projectId: projectId!, since, until: inclusiveUntil, by, limit: by === "day" ? "31" : "5", filter: "environment eq 'production'" }).toString();
    if (teamId) url.searchParams.set("teamId", teamId);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const reason = response.status === 401 || response.status === 403 ? "access"
        : response.status === 402 ? "plan"
        : response.status === 429 ? "rate-limit" : "connection";
      throw new AnalyticsError(reason);
    }
    try {
      return await response.json() as unknown;
    } catch {
      throw new AnalyticsError("response");
    }
  }

  const [totals, pages, sources, daily] = await Promise.allSettled([
    // `by=[]` is rejected by the live API. Production is a single audience bucket.
    query("environment"), query("requestPath"), query("referrerHostname"), query("day"),
  ]);
  if (totals.status === "rejected") {
    return { status: "unavailable", reason: totals.reason instanceof AnalyticsError ? totals.reason.reason : "connection" };
  }
  const parsed = totalsResponse.safeParse(totals.value);
  if (!parsed.success) return { status: "unavailable", reason: "response" };
  // Never sum visitors from pages, sources or daily buckets; audiences overlap.
  const total = Array.isArray(parsed.data.data)
    ? parsed.data.data[0] ?? { visitors: 0, pageviews: 0 }
    : parsed.data.data;

  function breakdown(result: PromiseSettledResult<unknown>, dimension: "requestPath" | "referrerHostname"): AnalyticsBreakdown[] | null {
    if (result.status === "rejected") return null;
    const parsed = breakdownResponse.safeParse(result.value);
    if (!parsed.success || parsed.data.data.some(row => row[dimension] === undefined)) return null;
    return parsed.data.data.map(row => ({
      label: row[dimension] || (dimension === "referrerHostname" ? "Direct / unknown" : "Unknown page"),
      pageviews: row.pageviews,
    })).sort((a, b) => b.pageviews - a.pageviews);
  }

  let dailyRows: DailyTraffic[] | null = null;
  if (daily.status === "fulfilled") {
    const result = dailyResponse.safeParse(daily.value);
    if (result.success) {
      const rows = result.data.data.map(row => ({ ...row, timestamp: new Date(row.timestamp).toISOString() }));
      const dayStart = Math.floor(Date.parse(since) / 86_400_000) * 86_400_000;
      // Reject duplicate, non-day or out-of-range buckets rather than plotting invented data.
      if (new Set(rows.map(row => row.timestamp)).size === rows.length && rows.every(row => {
        const stamp = Date.parse(row.timestamp);
        return stamp % 86_400_000 === 0 && stamp >= dayStart && stamp < Date.parse(until);
      })) dailyRows = rows.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    }
  }

  return {
    status: "ready", since, until, daily: dailyRows,
    visitors: total.visitors, pageviews: total.pageviews,
    topPages: breakdown(pages, "requestPath"),
    sources: breakdown(sources, "referrerHostname"),
  };
}
