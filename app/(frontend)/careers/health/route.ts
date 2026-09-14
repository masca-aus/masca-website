import { HEALTH_CACHE_SECONDS, formatHealthReport } from "@/utils/careersHealth"
import { loadCareerBoard } from "@/utils/careersSource"

// GET /careers/health — plain-text report for the Careers committee: is the
// sheet being read, which rows are hidden and why. Always 200 so a phone
// browser shows the text rather than error chrome; the first lines carry the
// verdict. Disallowed in robots.ts and marked noindex. The report is
// memoised for a short window so a looping scraper can't turn this route
// into a proxy that draws Google rate limits onto the site's egress IPs.

export const dynamic = "force-dynamic"

let cached: { at: number; body: string } | null = null

export async function GET() {
  const now = Date.now()
  if (!cached || now - cached.at > HEALTH_CACHE_SECONDS * 1000) {
    const report = await loadCareerBoard({ fresh: true, now: new Date(now) })
    cached = { at: now, body: formatHealthReport(report, new Date(now)) }
  }
  return new Response(cached.body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  })
}
