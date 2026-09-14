// Careers board — fetching the Google Sheet (server only).
//
// The sheet is shared "Anyone with the link can view" and read as CSV through
// Google's export endpoint, keyed by the spreadsheet ID and the tab's gid (a
// gid survives the tab being renamed; a tab name does not). The page that
// calls getCareerBoard() stays statically rendered: the fetch carries a
// 5-minute revalidate window, so a row added to the sheet shows on the live
// site within five minutes without a redeploy.
//
// Two entry points:
// - loadCareerBoard() never throws. It returns a status plus an officer-facing
//   explanation and the full list of hidden rows and warnings — this is what
//   /careers/health renders.
// - getCareerBoard() is for the page. A missing CAREERS_SHEET_ID is a normal
//   "unconfigured" result (preview deploys still build); anything else that
//   is not "ok" THROWS on purpose: when a background revalidation throws,
//   Next keeps serving the last good page, so students see slightly stale
//   roles rather than an error, and the Vercel log names the cause.

import {
  CareerSheetShapeError,
  melbourneToday,
  parseSheet,
  type HiddenRow,
  type Job,
} from "./careers"

/** Seconds between background refreshes of the sheet. */
export const CAREERS_REVALIDATE_SECONDS = 300
/** A jobs tab is a few hundred KB at most; anything bigger is a mistake. */
export const MAX_CSV_BYTES = 5 * 1024 * 1024
export const FETCH_TIMEOUT_MS = 8_000

export type CareerBoardStatus =
  | "ok"
  | "unconfigured"
  | "not-shared"
  | "not-found"
  | "wrong-tab"
  | "unreachable"
  | "too-big"

export type CareerBoardError = {
  /** One line, e.g. "Google asked us to sign in — the sheet isn't shared publicly." */
  title: string
  detail: string
  /** What the officer should do about it. */
  fix: string
}

export type SheetConfig = {
  sheetId: string
  gid: string
  /** Set by CAREERS_CSV_URL: read this CSV instead of Google (local dev, tests). */
  csvUrl?: string
}

export type CareerBoardReport = {
  status: CareerBoardStatus
  /** Empty unless status is "ok". */
  jobs: Job[]
  hidden: HiddenRow[]
  warnings: string[]
  info: string[]
  error?: CareerBoardError
  /** YYYY-MM-DD in Melbourne, the day the report was computed against. */
  today: string
  config: SheetConfig | null
}

/** What the page receives. */
export type CareerBoardData =
  | { status: "ok"; jobs: Job[] }
  | { status: "unconfigured" }

/**
 * CAREERS_SHEET_ID may be the bare spreadsheet ID or the whole pasted sheet
 * URL; CAREERS_SHEET_GID is the tab id (from `#gid=` in the URL), default 0.
 */
export type EnvLike = Record<string, string | undefined>

export function resolveSheetConfig(env: EnvLike = process.env): SheetConfig | null {
  // Escape hatch for local development: any http(s) CSV stands in for the sheet.
  const csvUrl = (env.CAREERS_CSV_URL ?? "").trim()
  if (/^https?:\/\//.test(csvUrl)) return { sheetId: "local-csv", gid: "0", csvUrl }

  const raw = (env.CAREERS_SHEET_ID ?? "").trim()
  if (!raw) return null
  const fromUrl = raw.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)
  const sheetId = fromUrl ? fromUrl[1] : raw
  if (!/^[A-Za-z0-9_-]{10,}$/.test(sheetId)) return null
  const gidEnv = (env.CAREERS_SHEET_GID ?? "").trim()
  const gidFromUrl = raw.match(/[#&?]gid=(\d+)/)
  const gid = /^\d+$/.test(gidEnv) ? gidEnv : gidFromUrl ? gidFromUrl[1] : "0"
  return { sheetId, gid }
}

export function sheetCsvUrl({ sheetId, gid, csvUrl }: SheetConfig): string {
  if (csvUrl) return csvUrl
  // The export endpoint returns raw CSV with none of the gviz endpoint's
  // header-detection or padded-column quirks, and needs no tab name.
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

export function sheetEditUrl({ sheetId, gid }: SheetConfig): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`
}

type FetchResult =
  | { ok: true; csv: string }
  | { ok: false; status: Exclude<CareerBoardStatus, "ok" | "unconfigured" | "wrong-tab">; error: CareerBoardError }

const SHARE_FIX =
  'Open the sheet → Share → General access → "Anyone with the link" → Viewer. The site updates within 5 minutes.'

/**
 * Fetches the CSV, classifying the ways Google says no. `fresh` bypasses the
 * data cache (used by /careers/health so the report is live).
 */
export async function fetchSheetCsv(
  config: SheetConfig,
  opts: { fresh?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<FetchResult> {
  const doFetch = opts.fetchImpl ?? fetch
  let res: Response
  try {
    res = await doFetch(sheetCsvUrl(config), {
      headers: { accept: "text/csv,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ...(opts.fresh ? { cache: "no-store" } : { next: { revalidate: CAREERS_REVALIDATE_SECONDS } }),
    })
  } catch (error) {
    return {
      ok: false,
      status: "unreachable",
      error: {
        title: "Google didn't answer.",
        detail: (error as Error).message,
        fix: "Usually temporary — the last good version keeps showing. If this persists for an hour, tell the web team.",
      },
    }
  }

  if (res.status === 404) {
    return {
      ok: false,
      status: "not-found",
      error: {
        title: "Google says that sheet doesn't exist (404).",
        detail: "The spreadsheet ID in CAREERS_SHEET_ID was not found.",
        fix: "Check CAREERS_SHEET_ID matches the part of the sheet URL between /d/ and /edit. Was the sheet moved to the bin?",
      },
    }
  }
  if (res.status === 400) {
    return {
      ok: false,
      status: "not-found",
      error: {
        title: "Google rejected the tab id (400).",
        detail: `gid "${config.gid}" is not a tab of that sheet.`,
        fix: "Open the Jobs tab and copy the number after #gid= in the address bar into CAREERS_SHEET_GID.",
      },
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      status: "unreachable",
      error: {
        title: `Google answered with HTTP ${res.status}.`,
        detail: res.statusText,
        fix: "Usually temporary — the last good version keeps showing. If this persists for an hour, tell the web team.",
      },
    }
  }

  const contentType = res.headers.get("content-type") ?? ""
  const declaredLength = Number(res.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_CSV_BYTES) {
    return {
      ok: false,
      status: "too-big",
      error: {
        title: "The tab exported far more data than a jobs list should.",
        detail: `${(declaredLength / 1024 / 1024).toFixed(1)} MB of CSV.`,
        fix: "Has a big dataset been pasted into the Jobs tab? Move it to another tab.",
      },
    }
  }
  const csv = await res.text()
  // A private sheet redirects to a Google sign-in page with HTTP 200.
  let landedOnSignIn = false
  try {
    landedOnSignIn = res.url !== "" && new URL(res.url).hostname === "accounts.google.com"
  } catch {
    // An unparsable final URL is not a sign-in page.
  }
  if (landedOnSignIn || !contentType.includes("text/csv") || /^\s*<(!doctype|html)/i.test(csv)) {
    return {
      ok: false,
      status: "not-shared",
      error: {
        title: "Google asked us to sign in — the sheet isn't shared publicly.",
        detail: `Expected CSV, received ${contentType || "an unknown type"}.`,
        fix: SHARE_FIX,
      },
    }
  }
  if (csv.length > MAX_CSV_BYTES) {
    return {
      ok: false,
      status: "too-big",
      error: {
        title: "The tab exported far more data than a jobs list should.",
        detail: `${(csv.length / 1024 / 1024).toFixed(1)} MB of CSV.`,
        fix: "Has a big dataset been pasted into the Jobs tab? Move it to another tab.",
      },
    }
  }
  return { ok: true, csv }
}

/** Never throws: every failure becomes a status with an officer-facing fix. */
export type LoadOptions = { fresh?: boolean; now?: Date; env?: EnvLike; fetchImpl?: typeof fetch }

export async function loadCareerBoard(opts: LoadOptions = {}): Promise<CareerBoardReport> {
  const today = melbourneToday(opts.now)
  const config = resolveSheetConfig(opts.env)
  const base = { jobs: [], hidden: [], warnings: [], info: [], today, config }

  if (!config) {
    return {
      ...base,
      status: "unconfigured",
      error: {
        title: "The careers board isn't connected to a sheet yet.",
        detail: "CAREERS_SHEET_ID is not set for this deployment.",
        fix: "Ask the web team to add CAREERS_SHEET_ID (and CAREERS_SHEET_GID if the Jobs tab isn't the first tab) in Vercel → Settings → Environment Variables, then redeploy.",
      },
    }
  }

  const fetched = await fetchSheetCsv(config, { fresh: opts.fresh, fetchImpl: opts.fetchImpl })
  if (!fetched.ok) return { ...base, status: fetched.status, error: fetched.error }

  try {
    const parsed = parseSheet(fetched.csv, today)
    return { ...base, status: "ok", ...parsed }
  } catch (error) {
    if (error instanceof CareerSheetShapeError) {
      return {
        ...base,
        status: "wrong-tab",
        error: {
          title: "The tab we're reading doesn't look like the Jobs tab.",
          detail: `${error.message}. Headers found: ${error.headersFound.join(", ") || "none"}.`,
          fix: "Open the Jobs tab — the number after #gid= in the address bar must equal CAREERS_SHEET_GID — and keep the header row as in the template (Title, Company, Apply link at minimum).",
        },
      }
    }
    throw error
  }
}

/**
 * For the page. Throws on anything that is not "ok" or "unconfigured" so ISR
 * keeps the last good page and the Vercel log carries the reason.
 */
export async function getCareerBoard(opts: LoadOptions = {}): Promise<CareerBoardData> {
  const report = await loadCareerBoard(opts)
  if (report.status === "unconfigured") return { status: "unconfigured" }
  if (report.status !== "ok") {
    const { title, detail, fix } = report.error ?? { title: report.status, detail: "", fix: "" }
    throw new Error(`[careers] ${report.status}: ${title} ${detail} ${fix}`.trim())
  }
  for (const warning of report.warnings) console.warn(`[careers] ${warning}`)
  return { status: "ok", jobs: report.jobs }
}
