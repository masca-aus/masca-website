import { formatHealthReport } from "@/utils/careersHealth"
import { loadCareerBoard } from "@/utils/careersSource"

// GET /careers/health — live, uncached, plain-text report for the Careers
// committee: is the sheet being read, which rows are hidden and why. Always
// 200 so a phone browser shows the text rather than error chrome; the first
// lines carry the verdict. Disallowed in robots.ts and marked noindex.

export const dynamic = "force-dynamic"

export async function GET() {
  const report = await loadCareerBoard({ fresh: true })
  return new Response(formatHealthReport(report, new Date()), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  })
}
