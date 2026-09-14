// Plain-text health report for the Careers committee (served at
// /careers/health). It answers, in under a minute and without a developer:
// is the site reading the sheet, which rows are hidden and why, and what
// couldn't be read. The report is public, so it never prints the sheet's
// id or URL: the sheet holds unpublished drafts and internal notes, and
// "anyone with the link" is only as private as the link.

import { formatClosesLabel } from "./careers"
import { CAREERS_REVALIDATE_SECONDS, type CareerBoardReport } from "./careersSource"

/** The route memoises the report for this long so a scraper can't hammer Google through it. */
export const HEALTH_CACHE_SECONDS = 30

const STATUS_LINE: Record<CareerBoardReport["status"], string> = {
  ok: "OK",
  unconfigured: "NOT CONNECTED",
  "not-shared": "PROBLEM — sheet not shared",
  "not-found": "PROBLEM — sheet or tab not found",
  "wrong-tab": "PROBLEM — wrong tab or headers",
  unreachable: "PROBLEM — Google unreachable",
  "too-big": "PROBLEM — tab too big",
}

function melbourneTimestamp(now: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now)
}

const pad = (s: string, width: number) => s.padEnd(width)

export function formatHealthReport(report: CareerBoardReport, now: Date): string {
  const lines: string[] = []
  lines.push("MASCA careers board — health check")
  lines.push(`Checked: ${melbourneTimestamp(now)} (Melbourne)`)
  lines.push(report.config ? `Sheet:   connected (tab gid ${report.config.gid})` : "Sheet:   not configured")
  lines.push(`Status:  ${STATUS_LINE[report.status]}`)
  lines.push("")

  if (report.error) {
    lines.push(report.error.title)
    if (report.error.detail) lines.push(report.error.detail)
    lines.push(`Fix: ${report.error.fix}`)
    lines.push("")
  }

  if (report.status === "ok") {
    lines.push(`Live on the site: ${report.jobs.length} ${report.jobs.length === 1 ? "role" : "roles"}`)
    for (const job of report.jobs) {
      const flags = [job.featured && "featured", formatClosesLabel(job)].filter(Boolean).join(", ")
      lines.push(`  ${pad(`Row ${job.row}`, 8)} ${pad(`${job.title} — ${job.company}`, 60)} ${flags}`)
    }
    lines.push("")

    lines.push(`Hidden: ${report.hidden.length} ${report.hidden.length === 1 ? "row" : "rows"}`)
    for (const row of report.hidden) {
      // Drafts stay private: an embargoed role must not be readable here.
      const title = row.reason === "unpublished" ? "" : (row.title ?? "")
      lines.push(`  ${pad(`Row ${row.row}`, 8)} ${pad(row.message, 60)} ${title}`.trimEnd())
    }
    lines.push("")

    lines.push(`Warnings: ${report.warnings.length}`)
    for (const warning of report.warnings) lines.push(`  ${warning}`)
    lines.push("")

    if (report.info.length) {
      lines.push("Notes")
      for (const note of report.info) lines.push(`  ${note}`)
      lines.push("")
    }
  }

  lines.push(
    `The public page updates within ${Math.round(CAREERS_REVALIDATE_SECONDS / 60)} minutes of a sheet edit. This report is at most ${HEALTH_CACHE_SECONDS} seconds old.`,
  )
  return lines.join("\n") + "\n"
}
