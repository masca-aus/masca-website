// Careers board — domain model and sheet normalisation (pure).
//
// Source of truth is a Google Sheet kept by the MASCA Careers team: no Payload
// collection, no Google API key. `utils/careersSource.ts` fetches it as CSV;
// everything in this file is a pure function of the CSV text plus an explicit
// `today`, so vitest exercises it in node with no network and no clock, and
// client components can import the types and label maps safely.
//
// Design rules the committee relies on:
// - Never throw on cell content. A typo degrades one value (with a warning
//   naming the spreadsheet row), it never takes the page down.
// - Every "days left" style value is computed here, server-side, against the
//   Melbourne calendar day, so the client never touches the clock and the
//   page hydrates identically.
// - Warnings are phrased for the Careers officer, who reads them at
//   /careers/health, not for a developer.

import { parseCsv } from "./csv"

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const JOB_TYPES = [
  "internship",
  "graduate",
  "vacation",
  "part-time",
  "casual",
  "full-time",
  "volunteer",
  "other",
] as const
export type JobType = (typeof JOB_TYPES)[number]

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  internship: "Internship",
  graduate: "Graduate",
  vacation: "Vacation program",
  "part-time": "Part-time",
  casual: "Casual",
  "full-time": "Full-time",
  volunteer: "Volunteer",
  other: "Other",
}

/** Where the role is. How it is worked (remote / hybrid / on-site) is `WorkMode`. */
export const JOB_LOCATIONS = [
  "vic",
  "nsw",
  "qld",
  "wa",
  "sa",
  "act",
  "tas",
  "nt",
  "australia",
  "malaysia",
  "other",
] as const
export type JobLocation = (typeof JOB_LOCATIONS)[number]

export const JOB_LOCATION_LABEL: Record<JobLocation, string> = {
  vic: "VIC",
  nsw: "NSW",
  qld: "QLD",
  wa: "WA",
  sa: "SA",
  act: "ACT",
  tas: "TAS",
  nt: "NT",
  australia: "Australia-wide",
  malaysia: "Malaysia",
  other: "Other",
}

/** How the role is worked — its own sheet column, kept apart from where. */
export const WORK_MODES = ["onsite", "hybrid", "remote"] as const
export type WorkMode = (typeof WORK_MODES)[number]

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
}

/** Whether the role is open to international (student-visa) applicants. */
export const INTERNATIONAL_OPTIONS = ["yes", "no", "unsure"] as const
export type International = (typeof INTERNATIONAL_OPTIONS)[number]

export const INTERNATIONAL_LABEL: Record<International, string> = {
  yes: "Open to international students",
  no: "Citizens / PR only",
  unsure: "Check working rights",
}

export const STUDY_LEVELS = [
  "any",
  "pre-penultimate",
  "penultimate",
  "final",
  "graduate",
  "postgraduate",
] as const
export type StudyLevel = (typeof STUDY_LEVELS)[number]

export const STUDY_LEVEL_LABEL: Record<StudyLevel, string> = {
  any: "Any year level",
  "pre-penultimate": "Pre-penultimate",
  penultimate: "Penultimate",
  final: "Final year",
  graduate: "Graduate",
  postgraduate: "Postgraduate",
}

export type JobSort = "newest" | "closing"

/** Days-left threshold at or below which a role is "closing soon". */
export const CLOSING_SOON_DAYS = 7
/** Days since `added` within which a role is "new". */
export const NEW_DAYS = 7
/**
 * A role with no closing date is hidden once its Added date is this old, so
 * rolling listings don't linger for a whole committee term. Re-dating Added
 * brings it back. Rows with neither date are shown indefinitely.
 */
export const MAX_AGE_DAYS_WITHOUT_CLOSE = 60
/** Guard rails against a dataset being pasted into the tab. */
export const MAX_SHEET_ROWS = 1000
export const MAX_TITLE_LENGTH = 120
export const MAX_COMPANY_LENGTH = 80
export const MAX_ELIGIBILITY_LENGTH = 200
export const MAX_PAY_LENGTH = 80
export const MAX_DESCRIPTION_LENGTH = 4000
export const MAX_TAGS = 8

export type Job = {
  /** Stable slug used by `?job=` deep links. */
  id: string
  /** Spreadsheet row (header is row 1) — for the health report. */
  row: number
  title: string
  company: string
  /** Sanitised http(s) URL. */
  companyWebsite?: string
  /** Sanitised https URL. */
  logoUrl?: string
  type: JobType
  /** Canonical places; empty when the sheet left the cell blank. */
  locations: JobLocation[]
  /** Free-text place detail beyond the codes, e.g. "Melbourne" or "Carlton". */
  locationNote?: string
  /** On-site / hybrid / remote; undefined when the sheet doesn't say. */
  workMode?: WorkMode
  /** Industry as typed (first-seen casing); `industryKey` is the facet slug. */
  industry?: string
  industryKey?: string
  international: International
  /** Never empty: `["any"]` when the sheet doesn't say. */
  studyLevels: StudyLevel[]
  eligibility?: string
  pay?: string
  /** Closing date as YYYY-MM-DD; undefined = rolling / not given. */
  closes?: string
  /** Human label for the closing date, e.g. "5 Oct". */
  closesLabel?: string
  /** Whole days until close, 0 = closes today. Undefined when rolling. */
  daysLeft?: number
  /** Date added as YYYY-MM-DD. */
  added?: string
  /** "Added 3 days ago" — computed on the server. */
  addedLabel?: string
  /** `https://…` or `mailto:…`. */
  applyHref: string
  applyKind: "web" | "email"
  /** Plain text; line breaks preserved. Never HTML. */
  description?: string
  tags: string[]
  featured: boolean
  isNew: boolean
  isClosingSoon: boolean
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

export type SheetField =
  | "title"
  | "company"
  | "companyWebsite"
  | "logoUrl"
  | "type"
  | "locations"
  | "workMode"
  | "industry"
  | "international"
  | "studyLevels"
  | "eligibility"
  | "pay"
  | "closes"
  | "added"
  | "apply"
  | "description"
  | "tags"
  | "published"
  | "featured"
  | "id"

/** The header row of the template sheet, in template order. */
export const TEMPLATE_HEADERS: Record<SheetField, string> = {
  published: "Published",
  featured: "Featured",
  title: "Title",
  company: "Company",
  type: "Type",
  locations: "Location",
  workMode: "Work mode",
  international: "International students",
  studyLevels: "Study level",
  closes: "Closes",
  apply: "Apply link",
  industry: "Industry",
  eligibility: "Eligibility",
  pay: "Pay",
  description: "Description",
  tags: "Tags",
  companyWebsite: "Company website",
  logoUrl: "Logo URL",
  added: "Added",
  id: "ID",
}

export const TEMPLATE_HEADER_ORDER: SheetField[] = [
  "published", "featured", "title", "company", "type", "locations", "workMode", "international", "studyLevels",
  "closes", "apply", "industry", "eligibility", "pay", "description", "tags", "companyWebsite",
  "logoUrl", "added", "id",
]

/**
 * Header cell → field. Keys are the header with everything but letters and
 * digits stripped and lowercased, so "Apply link", "apply_link" and
 * "APPLY LINK *" all match. Unknown headers are ignored.
 */
const HEADER_SYNONYMS: Record<string, SheetField> = {
  title: "title", role: "title", position: "title", jobtitle: "title", roletitle: "title", positiontitle: "title",
  company: "company", employer: "company", organisation: "company", organization: "company", companyname: "company", org: "company",
  companywebsite: "companyWebsite", website: "companyWebsite", companyurl: "companyWebsite", companylink: "companyWebsite", site: "companyWebsite",
  logourl: "logoUrl", logo: "logoUrl", logolink: "logoUrl", companylogo: "logoUrl", image: "logoUrl",
  type: "type", jobtype: "type", roletype: "type", category: "type", kind: "type",
  locations: "locations", location: "locations", locations1: "locations", state: "locations", states: "locations", where: "locations", city: "locations",
  workmode: "workMode", mode: "workMode", arrangement: "workMode", workarrangement: "workMode", workstyle: "workMode",
  worksetting: "workMode", workplace: "workMode", locationtype: "workMode", remotehybrid: "workMode", hybridremote: "workMode",
  remotehybridonsite: "workMode", onsitehybridremote: "workMode", onsiteremote: "workMode", remoteonsite: "workMode", remoteorhybrid: "workMode",
  industry: "industry", industries: "industry", sector: "industry", field: "industry",
  internationalstudents: "international", international: "international", intl: "international",
  intlstudents: "international", workingrights: "international", opentointernational: "international",
  opentointernationalstudents: "international", internationalok: "international", internationalfriendly: "international", visa: "international",
  studylevel: "studyLevels", studylevels: "studyLevels", yearlevel: "studyLevels", level: "studyLevels", year: "studyLevels", yearofstudy: "studyLevels",
  eligibility: "eligibility", eligible: "eligibility", requirements: "eligibility", whocanapply: "eligibility",
  pay: "pay", salary: "pay", rate: "pay", compensation: "pay", remuneration: "pay",
  closes: "closes", closingdate: "closes", closedate: "closes", deadline: "closes", closing: "closes",
  applicationsclose: "closes", applicationdeadline: "closes", due: "closes", duedate: "closes", applyby: "closes", closingon: "closes",
  added: "added", dateadded: "added", posted: "added", dateposted: "added", postedon: "added", listed: "added", created: "added",
  applylink: "apply", apply: "apply", link: "apply", url: "apply", applicationlink: "apply",
  applyurl: "apply", applicationurl: "apply", howtoapply: "apply", applyhere: "apply",
  // "Notes" is deliberately absent: the template's "Notes (internal)" column
  // is for the committee and must never render on the site.
  description: "description", details: "description", about: "description", summary: "description", jobdescription: "description", blurb: "description",
  tags: "tags", keywords: "tags", skills: "tags", labels: "tags",
  published: "published", live: "published", show: "published", visible: "published", active: "published", publish: "published", onsite: "published",
  featured: "featured", pinned: "featured", highlight: "featured", spotlight: "featured", pin: "featured", feature: "featured",
  id: "id", slug: "id", key: "id", ref: "id", jobid: "id", reference: "id",
}

/** Lowercase with everything but letters and digits removed. */
export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Header cell → field, or undefined when unrecognised. */
export function headerField(header: string): SheetField | undefined {
  // "Location(s)" → "location"; "Apply link *" → "applylink".
  return HEADER_SYNONYMS[squash(header.replace(/\(.*?\)/g, ""))]
}

export function mapHeaders(headers: string[]): (SheetField | undefined)[] {
  const seen = new Set<SheetField>()
  return headers.map((h) => {
    const field = headerField(h)
    // First matching column wins if a header is duplicated.
    if (!field || seen.has(field)) return undefined
    seen.add(field)
    return field
  })
}

/** A header row must at least name a Title and a Company. */
export function looksLikeHeaderRow(cells: string[]): boolean {
  const fields = new Set(mapHeaders(cells))
  return fields.has("title") && fields.has("company")
}

// ---------------------------------------------------------------------------
// Cell normalisers
// ---------------------------------------------------------------------------

const TYPE_ALIASES: Record<string, JobType> = {
  intern: "internship", interns: "internship", internship: "internship", internships: "internship",
  summerintern: "internship", summerinternship: "internship", winterintern: "internship",
  winterinternship: "internship", placement: "internship", industryplacement: "internship", wil: "internship",
  workintegratedlearning: "internship",
  vacation: "vacation", vacationer: "vacation", vacationprogram: "vacation", vacationerprogram: "vacation",
  vacprogram: "vacation", vac: "vacation", clerkship: "vacation", summerclerkship: "vacation", winterclerkship: "vacation",
  summerprogram: "vacation", summervacation: "vacation", wintervacation: "vacation",
  grad: "graduate", graduate: "graduate", graduates: "graduate", graduateprogram: "graduate",
  graduateprogramme: "graduate", gradprogram: "graduate", graduaterole: "graduate", gradrole: "graduate",
  entrylevel: "graduate",
  parttime: "part-time", pt: "part-time",
  casual: "casual", casualrole: "casual",
  fulltime: "full-time", ft: "full-time", permanent: "full-time", junior: "full-time",
  volunteer: "volunteer", volunteering: "volunteer", unpaid: "volunteer", probono: "volunteer",
  other: "other", misc: "other", cadetship: "other", apprenticeship: "other", traineeship: "other",
  scholarship: "other", competition: "other", hackathon: "other",
}

/** Location aliases that need no free-text note. */
const LOCATION_ALIASES: Record<string, JobLocation> = {
  vic: "vic", victoria: "vic",
  nsw: "nsw", newsouthwales: "nsw",
  qld: "qld", queensland: "qld",
  wa: "wa", westernaustralia: "wa",
  sa: "sa", southaustralia: "sa",
  act: "act", australiancapitalterritory: "act", canberra: "act",
  tas: "tas", tasmania: "tas",
  nt: "nt", northernterritory: "nt",
  australia: "australia", australiawide: "australia", national: "australia", nationwide: "australia",
  allstates: "australia", anywhereinaustralia: "australia", aus: "australia", au: "australia",
  multiple: "australia", various: "australia",
  malaysia: "malaysia", my: "malaysia",
  other: "other", overseas: "other", international: "other", global: "other",
}

/** City-level aliases: mapped to a region, and kept as the location note. */
const CITY_ALIASES: Record<string, JobLocation> = {
  melbourne: "vic", melb: "vic", geelong: "vic", ballarat: "vic", bendigo: "vic",
  sydney: "nsw", syd: "nsw", newcastle: "nsw", wollongong: "nsw",
  brisbane: "qld", bris: "qld", goldcoast: "qld", townsville: "qld", cairns: "qld",
  perth: "wa",
  adelaide: "sa",
  hobart: "tas", launceston: "tas",
  darwin: "nt",
  kualalumpur: "malaysia", kl: "malaysia", penang: "malaysia", johor: "malaysia", johorbahru: "malaysia",
  selangor: "malaysia", cyberjaya: "malaysia", putrajaya: "malaysia", sabah: "malaysia", sarawak: "malaysia",
  singapore: "other", sg: "other", nz: "other", newzealand: "other",
}

/** Work mode cell values — also the mode words that ride along in a Location cell. */
const WORK_MODE_ALIASES: Record<string, WorkMode> = {
  onsite: "onsite", inoffice: "onsite", inperson: "onsite", office: "onsite", campus: "onsite", oncampus: "onsite",
  facetoface: "onsite", inhouse: "onsite",
  hybrid: "hybrid", flexible: "hybrid", flex: "hybrid", mixed: "hybrid", partlyremote: "hybrid", partremote: "hybrid",
  remote: "remote", fullyremote: "remote", wfh: "remote", workfromhome: "remote", online: "remote", virtual: "remote",
  anywhere: "remote", remotefirst: "remote",
}

/** Mode words a committee member may tuck into Location: "Melbourne (hybrid)", "Remote". */
const MODE_IN_PLACE =
  /\b(?:fully[- ])?(?:remote|hybrid|on[- ]?site|in[- ]office|in[- ]person|wfh|work from home|online|virtual|anywhere)\b/gi

const STUDY_LEVEL_ALIASES: Record<string, StudyLevel> = {
  any: "any", all: "any", anyyear: "any", allyears: "any", open: "any", anylevel: "any", allstudents: "any",
  prepenultimate: "pre-penultimate", prepen: "pre-penultimate", firstyear: "pre-penultimate",
  "1styear": "pre-penultimate", secondyear: "pre-penultimate", "2ndyear": "pre-penultimate", early: "pre-penultimate",
  penultimate: "penultimate", pen: "penultimate", penult: "penultimate", penultimateyear: "penultimate",
  final: "final", finalyear: "final", lastyear: "final", graduating: "final",
  grad: "graduate", graduate: "graduate", graduates: "graduate", recentgraduate: "graduate", recentgrad: "graduate",
  postgrad: "postgraduate", postgraduate: "postgraduate", masters: "postgraduate", phd: "postgraduate",
  honours: "postgraduate", honors: "postgraduate",
}

const INTERNATIONAL_YES = new Set(["yes", "y", "true", "open", "ok", "international", "internationalok", "welcome", "all", "any", "1", "eligible"])
const INTERNATIONAL_NO = new Set([
  "no", "n", "false", "0", "citizensonly", "citizenonly", "pronly", "citizenorpr", "citizenpr", "citizenspr",
  "citizensandpr", "citizensorpr", "auscitizenpr", "australiancitizensonly", "domestic", "domesticonly",
  "prcitizen", "prcitizens", "closed", "auonly", "auscitizens", "notopen", "noteligible",
])
const INTERNATIONAL_UNSURE = new Set(["unsure", "unknown", "tbc", "tba", "maybe", "notsure", "unclear", "depends", "checklisting"])
const TRUTHY = new Set(["true", "yes", "y", "1", "x", "on", "live", "published", "featured"])
const TICKS = /^[✓✔☑]$/
const FALSY = new Set(["false", "no", "n", "0", "off", "draft", "hidden"])
const ROLLING = new Set(["rolling", "asap", "ongoing", "open", "untilfilled", "tba", "tbc", "na", "none", "nodeadline", "unknown", "rollingapplications"])
const SHEET_ERRORS = new Set(["#n/a", "#ref!", "#value!", "#error!", "#name?", "#div/0!", "#num!", "#null!", "loading..."])

/** Checkbox / yes-no cells: TRUE, yes, 1, a tick mark… */
export function isTruthyCell(raw: string | undefined): boolean {
  const s = (raw ?? "").trim()
  return TICKS.test(s) || TRUTHY.has(squash(s))
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MS_PER_DAY = 86_400_000

/** Zero-width characters that ride along when text is pasted from chat apps. */
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g

/** Trims, collapses whitespace, drops invisible characters, and blanks Sheets' error tokens. */
export function cleanCell(raw: string | undefined): string {
  const s = (raw ?? "").replace(INVISIBLE, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
  return SHEET_ERRORS.has(s.toLowerCase()) ? "" : s
}

/** Today's calendar date in Melbourne as YYYY-MM-DD (the committee's clock). */
export function melbourneToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export type DateParse = {
  /** YYYY-MM-DD, or undefined for rolling / unreadable. */
  date?: string
  /** Set when the cell said "rolling"/"TBA"/blank — no warning needed. */
  rolling: boolean
  /** Officer-facing note when the value was unreadable or ambiguous. */
  warning?: string
}

/**
 * Parses the dates a committee member is likely to type or that Sheets is
 * likely to export: ISO (2026-10-05), Australian day-first slashes or dashes
 * (5/10/2026, 05-10-26) and written months with a year (5 Oct 2026,
 * Oct 5, 2026, optional weekday). "Rolling", "TBA" and friends mean no
 * deadline. Anything else — including a month-day with no year — is left
 * blank with a warning rather than guessed.
 */
export function parseSheetDate(raw: string): DateParse {
  let s = cleanCell(raw).toLowerCase()
  if (s === "" || s === "-" || s === "—" || ROLLING.has(squash(s))) return { rolling: true }

  // Drop a leading weekday ("Sun 5 Oct", "Sunday, 5 October 2026").
  s = s.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+/, "")
  // Drop a trailing time ("2026-10-05T00:00:00", "5/10/2026 17:00").
  s = s.replace(/[t\s]\d{1,2}:\d{2}.*$/, "").trim()

  let y: number | undefined, m: number | undefined, d: number | undefined
  let warning: string | undefined

  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]

  if (!match) {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
    if (match) {
      // Day-first: MASCA is Australian, so 5/10 is 5 October, never 10 May.
      ;[d, m, y] = [Number(match[1]), Number(match[2]), expandYear(match[3])]
      if (m > 12 && d <= 12) {
        // Only readable as a US-style month/day — accept it, but say so.
        ;[d, m] = [m, d]
        warning = `"${raw.trim()}" looked like a US month-first date and was read as ${d}/${m}/${y}`
      }
    }
  }

  if (!match) {
    // "5 Oct 2026", "5th October", "5-Oct-26".
    match = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]+)\.?,?(?:[\s-]+(\d{2}|\d{4}))?$/)
    if (match) [d, m, y] = [Number(match[1]), monthIndex(match[2]), match[3] ? expandYear(match[3]) : undefined]
  }

  if (!match) {
    // "Oct 5, 2026", "October 5".
    match = s.match(/^([a-z]+)\.?[\s-]+(\d{1,2})(?:st|nd|rd|th)?,?(?:[\s-]+(\d{2}|\d{4}))?$/)
    if (match) [m, d, y] = [monthIndex(match[1]), Number(match[2]), match[3] ? expandYear(match[3]) : undefined]
  }

  if (m === undefined || d === undefined || !Number.isFinite(m) || m < 1 || m > 12 || d < 1 || d > 31) {
    // Punctuation placeholders ("?", "…") land here too, on purpose: a
    // deadline nobody knows yet deserves a nudge, not a silent "rolling".
    return { rolling: false, warning: `couldn't read the date "${raw.trim()}" — use YYYY-MM-DD` }
  }
  if (y === undefined) {
    return { rolling: false, warning: `"${raw.trim()}" has no year — use YYYY-MM-DD` }
  }

  const utc = new Date(Date.UTC(y, m - 1, d))
  // Reject impossible days like 31 Feb, which Date would silently roll over.
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
    return { rolling: false, warning: `"${raw.trim()}" isn't a real date` }
  }
  return { date: toIsoDate(utc), rolling: false, warning }
}

function expandYear(raw: string): number {
  const n = Number(raw)
  return raw.length === 2 ? 2000 + n : n
}

function monthIndex(name: string): number {
  const idx = MONTHS.indexOf(name.slice(0, 3))
  return idx === -1 ? Number.NaN : idx + 1
}

function toIsoDate(utc: Date): string {
  return utc.toISOString().slice(0, 10)
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY)
}

/** "5 Oct", or "5 Oct 2027" when the year differs from today's. */
export function formatShortDate(iso: string, today: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const label = `${d} ${MONTH_LABEL[m - 1]}`
  return y === Number(today.slice(0, 4)) ? label : `${label} ${y}`
}

/** "Added today" / "Added yesterday" / "Added 3 days ago" / "Added 2 weeks ago" / "Added 5 Aug". */
export function formatAddedLabel(added: string, today: string): string {
  const days = daysBetween(added, today)
  if (days <= 0) return "Added today"
  if (days === 1) return "Added yesterday"
  if (days < 14) return `Added ${days} days ago`
  if (days < 56) return `Added ${Math.floor(days / 7)} weeks ago`
  return `Added ${formatShortDate(added, today)}`
}

/** "Closes today" / "Closes tomorrow" / "Closes in 5 days" / "Closes 5 Oct" / "Rolling applications". */
export function formatClosesLabel(job: Pick<Job, "daysLeft" | "closesLabel">): string {
  if (job.daysLeft === undefined || !job.closesLabel) return "Rolling applications"
  if (job.daysLeft === 0) return "Closes today"
  if (job.daysLeft === 1) return "Closes tomorrow"
  if (job.daysLeft <= CLOSING_SOON_DAYS) return `Closes in ${job.daysLeft} days`
  return `Closes ${job.closesLabel}`
}

/** Accepts http(s) URLs, or a bare domain like "example.com/apply" (upgraded to https). */
export function sanitiseHttpUrl(raw: string | undefined, opts: { httpsOnly?: boolean } = {}): string | undefined {
  const s = cleanCell(raw)
  if (!s || /\s/.test(s)) return undefined
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== "https:" && (opts.httpsOnly || url.protocol !== "http:")) return undefined
    if (!url.hostname.includes(".")) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** http(s) link → web; email or mailto: → email; anything else is rejected. */
export function sanitiseApplyLink(
  raw: string | undefined,
): { href: string; kind: "web" | "email" } | undefined {
  const s = cleanCell(raw)
  if (!s) return undefined
  const mail = s.toLowerCase().startsWith("mailto:") ? s.slice(7).trim() : s
  if (EMAIL_RE.test(mail)) return { href: `mailto:${mail}`, kind: "email" }
  const href = sanitiseHttpUrl(s)
  return href ? { href, kind: "web" } : undefined
}

/** Splits a multi-value cell on commas, semicolons, slashes, pipes and newlines. */
export function splitList(raw: string | undefined): string[] {
  const seen = new Set<string>()
  return (raw ?? "")
    .split(/[,;\n/|]+/)
    .map((s) => cleanCell(s).replace(/\.$/, ""))
    .filter((s) => {
      const key = s.toLowerCase()
      if (!s || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Lowercase slug: letters, digits and single dashes. */
export function slugify(raw: string, maxLength = 60): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "")
}

/** Readable, stable deep-link ID when the sheet has no ID cell. */
export function deriveJobId(company: string, title: string): string {
  return slugify(`${company} ${title}`) || "role"
}

// ---------------------------------------------------------------------------
// Row → Job
// ---------------------------------------------------------------------------

export type SheetRow = Partial<Record<SheetField, string>>

export function rowToRecord(fields: (SheetField | undefined)[], cells: string[]): SheetRow {
  const row: SheetRow = {}
  fields.forEach((field, i) => {
    if (!field) return
    // Descriptions keep their line breaks; everything else is single-line.
    const value =
      field === "description"
        ? (cells[i] ?? "").replace(INVISIBLE, "").replace(/\r\n?/g, "\n").trim()
        : cleanCell(cells[i])
    if (value) row[field] = value
  })
  return row
}

/**
 * A row that holds nothing but unticked checkboxes is an empty row: Sheets
 * exports `FALSE` for every unticked box in the checkbox range, so a template
 * with boxes on A2:A1000 produces hundreds of these.
 */
export function isBlankRecord(row: SheetRow): boolean {
  return Object.entries(row).every(
    ([field, value]) => (field === "published" || field === "featured") && !isTruthyCell(value),
  )
}

export type ToJobContext = {
  /** YYYY-MM-DD in Melbourne. */
  today: string
  /** Spreadsheet row number (header is row 1), for warnings. */
  rowNumber: number
  /** Whether the sheet has a Published column at all. */
  hasPublishedColumn: boolean
}

export type HiddenReason = "unpublished" | "closed" | "stale" | "invalid"

export type HiddenRow = {
  row: number
  reason: HiddenReason
  /** Officer-facing sentence. */
  message: string
  title?: string
}

export type ToJobResult =
  | { job: Job; warnings: string[] }
  | { hidden: HiddenRow; warnings: string[] }

/** Normalises one sheet row. Warnings name the spreadsheet row. */
export function toJob(row: SheetRow, ctx: ToJobContext): ToJobResult {
  const warnings: string[] = []
  const warn = (message: string) => warnings.push(`Row ${ctx.rowNumber}: ${message}`)
  const label = [row.title, row.company].filter(Boolean).join(" — ") || undefined

  // Published column present → only ticked rows show, so a half-typed row
  // never leaks. Column absent → everything shows.
  if (ctx.hasPublishedColumn && !isTruthyCell(row.published)) {
    return {
      hidden: { row: ctx.rowNumber, reason: "unpublished", title: label, message: "Published is unticked" },
      warnings,
    }
  }

  let title = row.title ?? ""
  let company = row.company ?? ""
  if (!title || !company) {
    const missing = [!title && "Title", !company && "Company"].filter(Boolean).join(" and ")
    return {
      hidden: { row: ctx.rowNumber, reason: "invalid", title: label, message: `missing ${missing}` },
      warnings,
    }
  }
  if (title.length > MAX_TITLE_LENGTH) {
    title = `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    warn(`Title is very long — shortened on the site`)
  }
  if (company.length > MAX_COMPANY_LENGTH) {
    company = `${company.slice(0, MAX_COMPANY_LENGTH - 1).trimEnd()}…`
    warn(`Company is very long — shortened on the site`)
  }

  const apply = sanitiseApplyLink(row.apply)
  if (!apply) {
    const shown = row.apply ? `"${row.apply}" isn't a usable Apply link` : "missing Apply link"
    return {
      hidden: {
        row: ctx.rowNumber,
        reason: "invalid",
        title: label,
        message: `${shown} — paste the full https:// address or an email, not a linked word`,
      },
      warnings,
    }
  }

  const closesParse = row.closes ? parseSheetDate(row.closes) : { rolling: true }
  if (closesParse.warning) warn(`Closes: ${closesParse.warning}`)
  const closes = closesParse.date
  const daysLeft = closes ? daysBetween(ctx.today, closes) : undefined
  if (daysLeft !== undefined && daysLeft < 0) {
    return {
      hidden: {
        row: ctx.rowNumber,
        reason: "closed",
        title: label,
        message: `closed on ${formatShortDate(closes as string, ctx.today)}`,
      },
      warnings,
    }
  }

  if (daysLeft !== undefined && daysLeft > 730) warn(`Closes "${row.closes}" is more than two years away — check the year`)

  const addedParse = row.added ? parseSheetDate(row.added) : { rolling: true }
  if (addedParse.warning) warn(`Added: ${addedParse.warning}`)
  let added = addedParse.date
  let addedDaysAgo = added ? daysBetween(added, ctx.today) : undefined
  if (addedDaysAgo !== undefined && addedDaysAgo < 0) {
    // A future Added date would pin the row as "new" indefinitely.
    warn(`Added "${row.added}" is in the future — check the date`)
    added = undefined
    addedDaysAgo = undefined
  }
  if (closes === undefined && addedDaysAgo !== undefined && addedDaysAgo > MAX_AGE_DAYS_WITHOUT_CLOSE) {
    return {
      hidden: {
        row: ctx.rowNumber,
        reason: "stale",
        title: label,
        message: `no closing date and Added is ${addedDaysAgo} days old — re-date Added to bring it back`,
      },
      warnings,
    }
  }

  let type: JobType = "other"
  if (row.type) {
    const mapped = TYPE_ALIASES[squash(row.type)]
    if (mapped) type = mapped
    else warn(`Type "${row.type}" isn't one of the options — shown as Other`)
  }

  // Work mode has its own column; a mode word tucked into Location
  // ("Melbourne (hybrid)", "Remote") fills it in when that column is blank.
  let workMode: WorkMode | undefined
  if (row.workMode) {
    const mapped = WORK_MODE_ALIASES[squash(row.workMode)]
    if (mapped) workMode = mapped
    else warn(`Work mode "${row.workMode}" isn't one of the options — use On-site, Hybrid or Remote`)
  }

  const locations: JobLocation[] = []
  const notes: string[] = []
  for (const token of splitList(row.locations)) {
    const modeFromPlace = (token.match(MODE_IN_PLACE) ?? []).map((w) => WORK_MODE_ALIASES[squash(w)]).find(Boolean)
    if (modeFromPlace && !workMode) workMode = modeFromPlace
    const place = token
      .replace(MODE_IN_PLACE, "")
      .replace(/[()]/g, " ")
      .replace(/^[\s,;:/|–—-]+|[\s,;:/|–—-]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
    // A token that was only a mode word ("Remote") names no place.
    if (!place) continue
    const key = squash(place)
    const region = LOCATION_ALIASES[key]
    const city = CITY_ALIASES[key]
    if (region) {
      if (!locations.includes(region)) locations.push(region)
    } else if (city) {
      if (!locations.includes(city)) locations.push(city)
      notes.push(place)
    } else if (key) {
      if (!locations.includes("other")) locations.push("other")
      notes.push(place)
      warn(`Location "${place}" isn't a state or one of the options — filed under Other`)
    }
  }

  let international: International = "unsure"
  if (row.international) {
    const key = squash(row.international)
    if (INTERNATIONAL_YES.has(key)) international = "yes"
    else if (INTERNATIONAL_NO.has(key)) international = "no"
    else if (!INTERNATIONAL_UNSURE.has(key)) warn(`International students "${row.international}" read as Unsure — use Yes, No or Unsure`)
  }

  const studyLevels: StudyLevel[] = []
  for (const token of splitList(row.studyLevels)) {
    const mapped = STUDY_LEVEL_ALIASES[squash(token)]
    if (mapped) {
      if (!studyLevels.includes(mapped)) studyLevels.push(mapped)
    } else {
      warn(`Study level "${token}" isn't one of the options — ignored`)
    }
  }
  if (studyLevels.length === 0 || studyLevels.includes("any")) studyLevels.splice(0, studyLevels.length, "any")

  const industry = row.industry
  const logoUrl = sanitiseHttpUrl(row.logoUrl, { httpsOnly: true })
  if (row.logoUrl && !logoUrl) warn(`Logo URL must start with https:// — showing a monogram instead`)
  const companyWebsite = sanitiseHttpUrl(row.companyWebsite)
  if (row.companyWebsite && !companyWebsite) warn(`Company website "${row.companyWebsite}" isn't a web address — ignored`)

  let description = row.description
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`
    warn(`Description is very long — cut short on the site`)
  }
  const clip = (value: string | undefined, max: number, label: string) => {
    if (!value || value.length <= max) return value
    warn(`${label} is very long — shortened on the site`)
    return `${value.slice(0, max - 1).trimEnd()}…`
  }
  const eligibility = clip(row.eligibility, MAX_ELIGIBILITY_LENGTH, "Eligibility")
  const pay = clip(row.pay, MAX_PAY_LENGTH, "Pay")

  let tags = splitList(row.tags)
  if (tags.length > MAX_TAGS) {
    tags = tags.slice(0, MAX_TAGS)
    warn(`more than ${MAX_TAGS} tags — only the first ${MAX_TAGS} are shown`)
  }

  let id = deriveJobId(company, title)
  if (row.id) {
    const explicit = slugify(row.id)
    if (explicit) {
      if (explicit !== row.id) warn(`ID tidied to "${explicit}" (lowercase letters, numbers and dashes only)`)
      id = explicit
    } else {
      warn(`ID "${row.id}" has no usable characters — using the automatic one`)
    }
  }

  const job: Job = {
    id,
    row: ctx.rowNumber,
    title,
    company,
    companyWebsite,
    logoUrl,
    type,
    locations,
    locationNote: notes.length ? notes.join(", ") : undefined,
    workMode,
    industry,
    industryKey: industry ? slugify(industry) || undefined : undefined,
    international,
    studyLevels,
    eligibility,
    pay,
    closes,
    closesLabel: closes ? formatShortDate(closes, ctx.today) : undefined,
    daysLeft,
    added,
    addedLabel: added ? formatAddedLabel(added, ctx.today) : undefined,
    applyHref: apply.href,
    applyKind: apply.kind,
    description,
    tags,
    featured: isTruthyCell(row.featured),
    isNew: addedDaysAgo !== undefined && addedDaysAgo <= NEW_DAYS,
    isClosingSoon: daysLeft !== undefined && daysLeft <= CLOSING_SOON_DAYS,
  }
  return { job, warnings }
}

// ---------------------------------------------------------------------------
// Sheet → board
// ---------------------------------------------------------------------------

export class CareerSheetShapeError extends Error {
  constructor(
    message: string,
    readonly headersFound: string[],
    /** "shape": no usable header row; "size": more rows than a jobs list should have. */
    readonly kind: "shape" | "size" = "shape",
  ) {
    super(message)
    this.name = "CareerSheetShapeError"
  }
}

export type ParsedSheet = {
  /** Live roles (published, not closed), sorted newest first. */
  jobs: Job[]
  /** Rows that are not on the site, with the reason — for the health report. */
  hidden: HiddenRow[]
  /** Officer-facing problems, each naming its spreadsheet row. */
  warnings: string[]
  /** Non-problem notes (ignored columns, missing optional columns). */
  info: string[]
  /** Headers the parser recognised, in sheet order. */
  headersFound: string[]
}

/**
 * CSV text → live jobs. The header row is the first of rows 1–5 that names a
 * Title and a Company (so a banner row above the table is harmless); throws
 * CareerSheetShapeError when there is none, or when the Apply link column is
 * missing. `today` is injected so tests are deterministic.
 */
export function parseSheet(csv: string, today: string): ParsedSheet {
  const rows = parseCsv(csv)
  const headerIndex = rows.slice(0, 5).findIndex(looksLikeHeaderRow)
  if (headerIndex === -1) {
    const found = rows[0]?.map(cleanCell).filter(Boolean) ?? []
    throw new CareerSheetShapeError(
      rows.length === 0
        ? "The tab is empty"
        : `Couldn't find a header row with a Title and a Company column in the first five rows`,
      found,
    )
  }

  const headers = rows[headerIndex]
  const fields = mapHeaders(headers)
  const known = new Set(fields.filter((f): f is SheetField => f !== undefined))
  const headersFound = headers.map(cleanCell).filter(Boolean)
  if (!known.has("apply")) {
    throw new CareerSheetShapeError(`Couldn't find an "Apply link" column`, headersFound)
  }

  const info: string[] = []
  const ignored = headers.filter((h, i) => cleanCell(h) && fields[i] === undefined).map(cleanCell)
  if (ignored.length) info.push(`Ignored columns (not used by the site): ${ignored.join(", ")}`)
  const hasPublishedColumn = known.has("published")
  if (!hasPublishedColumn) info.push("No Published column — every row is live")
  if (!known.has("closes")) info.push("No Closes column — roles never expire automatically")

  // Sheet row number: rows before the header, the header itself, then 1-based.
  const firstDataRow = headerIndex + 2
  const records = rows
    .slice(headerIndex + 1)
    .map((cells, index) => ({ rowNumber: firstDataRow + index, record: rowToRecord(fields, cells) }))
    .filter(({ record }) => !isBlankRecord(record)) // blank rows, or only unticked boxes / ignored columns
  if (records.length > MAX_SHEET_ROWS) {
    throw new CareerSheetShapeError(
      `The tab has ${records.length} filled rows — more than the ${MAX_SHEET_ROWS} the site will read. Has a dataset been pasted in?`,
      headersFound,
      "size",
    )
  }

  const jobs: Job[] = []
  const hidden: HiddenRow[] = []
  const warnings: string[] = []
  const seenIds = new Map<string, number>()
  records.forEach(({ rowNumber, record }) => {
    let result: ToJobResult
    try {
      result = toJob(record, { today, rowNumber, hasPublishedColumn })
    } catch (error) {
      // A bug on one weird row must not take the board down.
      result = {
        hidden: { row: rowNumber, reason: "invalid", message: `couldn't be read (${(error as Error).message})` },
        warnings: [],
      }
    }
    warnings.push(...result.warnings)
    if ("hidden" in result) {
      hidden.push(result.hidden)
      return
    }
    // Keep deep links unambiguous if two rows collide on an ID.
    const count = (seenIds.get(result.job.id) ?? 0) + 1
    seenIds.set(result.job.id, count)
    if (count > 1) {
      result.job.id = `${result.job.id}-${count}`
      warnings.push(`Row ${rowNumber}: same company and title as an earlier row — its link is ?job=${result.job.id}`)
    }
    jobs.push(result.job)
  })

  const undated = jobs.filter((j) => !j.added).length
  if (undated > 0) {
    info.push(
      undated === jobs.length
        ? `${jobs.length === 1 ? "The only role has no" : `None of the ${jobs.length} roles have an`} Added date — fill Added so "Newest first" means something and students can see how fresh a role is`
        : `${undated} ${undated === 1 ? "role has" : "roles have"} no Added date — they sort as newest; fill Added so students can see how fresh they are`,
    )
  }
  const featuredCount = jobs.filter((j) => j.featured).length
  if (featuredCount > 3) {
    info.push(`${featuredCount} roles are Featured — three at most keeps "Newest first" meaningful`)
  }
  // A sheet created under another locale exports WAHR/VERDADERO/VRAI instead
  // of TRUE, which reads as "unticked" and hides everything.
  if (hasPublishedColumn && jobs.length === 0) {
    const odd = records
      .map(({ record }) => record.published ?? "")
      .find((v) => v && !isTruthyCell(v) && !FALSY.has(squash(v)))
    if (odd) {
      warnings.push(
        `Published values look like "${odd}" — the site only understands TRUE/FALSE; set File › Settings › Locale to Australia`,
      )
    }
  }

  return { jobs: sortJobs(jobs, "newest"), hidden, warnings, info, headersFound }
}

/**
 * newest: featured first, then most recently added (undated rows count as
 * newest, in sheet order — "add a row at the bottom" must surface it), then
 * closing soonest. closing: closing soonest first (rolling roles last), then
 * most recently added — featured is deliberately NOT pinned here so the sort
 * name stays true.
 */
export function sortJobs(jobs: Job[], sort: JobSort): Job[] {
  const byAddedDesc = (a: Job, b: Job) => {
    if (a.added === b.added) return 0
    if (!a.added) return -1
    if (!b.added) return 1
    return b.added.localeCompare(a.added)
  }
  const byDaysLeftAsc = (a: Job, b: Job) =>
    (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY)
  const byRowDesc = (a: Job, b: Job) => b.row - a.row

  return [...jobs].sort((a, b) => {
    if (sort === "newest") {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      return byAddedDesc(a, b) || byDaysLeftAsc(a, b) || byRowDesc(a, b)
    }
    return byDaysLeftAsc(a, b) || byAddedDesc(a, b) || byRowDesc(a, b)
  })
}
