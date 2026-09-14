// Careers board filtering — pure functions shared by the client board and
// its tests. Filter state round-trips through the URL query string so a
// filtered view can be shared or reloaded:
//
//   /careers?q=intern&type=internship,graduate&loc=vic&intl=yes&sort=closing
//
// The view state rides alongside: `job` (the selected role), `page` and
// `per` (cards per page). Defaults are omitted when serialising so an
// untouched board leaves the URL clean. Unknown values are dropped rather
// than thrown: a mangled link still opens the board.

import {
  JOB_LOCATIONS,
  JOB_LOCATION_LABEL,
  JOB_TYPES,
  JOB_TYPE_LABEL,
  STUDY_LEVELS,
  STUDY_LEVEL_LABEL,
  slugify,
  sortJobs,
  type Job,
  type JobLocation,
  type JobSort,
  type JobType,
  type StudyLevel,
} from "./careers"

/** A pasted paragraph must not become a multi-kilobyte query string. */
export const MAX_QUERY_LENGTH = 120

/**
 * International-students filter. "yes" shows only roles confirmed open to
 * international students; "maybe" also keeps roles that haven't said either
 * way (reached from the empty state, so the toolbar toggle stays binary).
 */
export type IntlFilter = "off" | "yes" | "maybe"

export type CareerFilters = {
  q: string
  types: JobType[]
  locations: JobLocation[]
  intl: IntlFilter
  levels: StudyLevel[]
  /** Industry facet keys (see `getIndustryFacets`). */
  industries: string[]
  sort: JobSort
}

export const EMPTY_FILTERS: CareerFilters = {
  q: "",
  types: [],
  locations: [],
  intl: "off",
  levels: [],
  industries: [],
  sort: "newest",
}

/** Query-string keys. `job`, `page` and `per` are view state and live beside the filters. */
export const FILTER_PARAMS = {
  q: "q",
  types: "type",
  locations: "loc",
  intl: "intl",
  levels: "level",
  industries: "industry",
  sort: "sort",
  job: "job",
  page: "page",
  per: "per",
} as const

/** Cards per page. The first entry is the default and stays out of the URL. */
export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = PAGE_SIZES[0]

const isPageSize = (n: number): n is PageSize => (PAGE_SIZES as readonly number[]).includes(n)

type ParamSource = Pick<URLSearchParams, "get">

const isJobType = (v: string): v is JobType => (JOB_TYPES as readonly string[]).includes(v)
const isJobLocation = (v: string): v is JobLocation => (JOB_LOCATIONS as readonly string[]).includes(v)
const isStudyLevel = (v: string): v is StudyLevel => (STUDY_LEVELS as readonly string[]).includes(v)

function list(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s, i, all) => s && all.indexOf(s) === i)
}

export function parseFilters(params: ParamSource): CareerFilters {
  const intl = params.get(FILTER_PARAMS.intl)
  const sort = params.get(FILTER_PARAMS.sort)
  return {
    q: (params.get(FILTER_PARAMS.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    types: list(params.get(FILTER_PARAMS.types)).filter(isJobType),
    locations: list(params.get(FILTER_PARAMS.locations)).filter(isJobLocation),
    intl: intl === "yes" || intl === "maybe" ? intl : "off",
    levels: list(params.get(FILTER_PARAMS.levels)).filter(isStudyLevel).filter((l) => l !== "any"),
    industries: list(params.get(FILTER_PARAMS.industries)),
    sort: sort === "closing" ? "closing" : "newest",
  }
}

/** Only non-default values are written, so a fresh board has an empty query. */
export function serialiseFilters(filters: CareerFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set(FILTER_PARAMS.q, filters.q.slice(0, MAX_QUERY_LENGTH))
  if (filters.types.length) params.set(FILTER_PARAMS.types, filters.types.join(","))
  if (filters.locations.length) params.set(FILTER_PARAMS.locations, filters.locations.join(","))
  if (filters.intl !== "off") params.set(FILTER_PARAMS.intl, filters.intl)
  if (filters.levels.length) params.set(FILTER_PARAMS.levels, filters.levels.join(","))
  if (filters.industries.length) params.set(FILTER_PARAMS.industries, filters.industries.join(","))
  if (filters.sort !== "newest") params.set(FILTER_PARAMS.sort, filters.sort)
  return params
}

/** Filters plus the view state — selected role, page, page size — the board keeps in the URL. */
export type BoardUrlState = CareerFilters & {
  job: string | null
  /**
   * 1-based page, or null when the URL doesn't say. A shared `?job=` link
   * carries no page and the board opens it on the page that holds the role;
   * the board's own writes always name the page (`?job=x&page=1`), so a
   * filter change can never yank the list to wherever the selected role
   * moved.
   */
  page: number | null
  per: PageSize
}

export const EMPTY_BOARD_URL: BoardUrlState = {
  ...EMPTY_FILTERS,
  job: null,
  page: null,
  per: DEFAULT_PAGE_SIZE,
}

/** Deep-link ids are slugs; anything else in `?job=` is ignored. */
export function isValidJobId(id: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(id)
}

export function parseBoardUrl(params: ParamSource | null): BoardUrlState {
  if (!params) return { ...EMPTY_BOARD_URL }
  // Tolerate the id as a committee member typed it ("NLB Tech Intern 2027"):
  // the sheet tidies ids to slugs, so tidy the link the same way.
  const job = slugify(params.get(FILTER_PARAMS.job) ?? "")
  const page = params.get(FILTER_PARAMS.page) ?? ""
  const per = Number(params.get(FILTER_PARAMS.per))
  return {
    ...parseFilters(params),
    job: job && isValidJobId(job) ? job : null,
    page: /^[1-9]\d{0,4}$/.test(page) ? Number(page) : null,
    per: isPageSize(per) ? per : DEFAULT_PAGE_SIZE,
  }
}

/** Query string without the leading "?"; "" when everything is default. */
export function serialiseBoardUrl(state: BoardUrlState): string {
  const params = serialiseFilters(state)
  if (state.per !== DEFAULT_PAGE_SIZE) params.set(FILTER_PARAMS.per, String(state.per))
  // Page 1 is only spelled out beside a selected role — see BoardUrlState.page.
  if (state.page !== null && (state.page > 1 || state.job)) params.set(FILTER_PARAMS.page, String(state.page))
  if (state.job) params.set(FILTER_PARAMS.job, state.job)
  // Commas are legal in a query string and read better than %2C.
  return params.toString().replace(/%2C/g, ",")
}

/** Pages that `total` items make at `per` a page — never fewer than one. */
export function pageCount(total: number, per: number): number {
  return Math.max(1, Math.ceil(total / per))
}

/** The 1-based page holding the item at 0-based `index` (a missing item, -1, lands on page 1). */
export function pageOf(index: number, per: number): number {
  return Math.floor(Math.max(0, index) / per) + 1
}

/** The items on 1-based `page`. */
export function pageSlice<T>(items: T[], page: number, per: number): T[] {
  return items.slice((page - 1) * per, page * per)
}

/** Number of engaged filter groups — search and sort don't count. */
export function countActiveFilters(filters: CareerFilters): number {
  return (
    (filters.types.length ? 1 : 0) +
    (filters.locations.length ? 1 : 0) +
    (filters.intl !== "off" ? 1 : 0) +
    (filters.levels.length ? 1 : 0) +
    (filters.industries.length ? 1 : 0)
  )
}

export function hasAnyFilter(filters: CareerFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.q !== ""
}

/** Text a search query is matched against. */
export function searchHaystack(job: Job): string {
  return [
    job.title,
    job.company,
    job.industry,
    JOB_TYPE_LABEL[job.type],
    ...job.locations.map((l) => JOB_LOCATION_LABEL[l]),
    job.locationNote,
    ...job.studyLevels.map((l) => STUDY_LEVEL_LABEL[l]),
    job.eligibility,
    job.pay,
    ...job.tags,
    job.description,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase()
}

/** Every whitespace-separated term must appear somewhere in the job. */
export function matchesSearch(job: Job, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = searchHaystack(job)
  return terms.every((term) => haystack.includes(term))
}

export function matchesIntl(job: Job, intl: IntlFilter): boolean {
  if (intl === "off") return true
  if (intl === "yes") return job.international === "yes"
  return job.international !== "no"
}

/** OR within a group, AND across groups; a job open to "any" level matches every level pill. */
export function matchesFilters(job: Job, filters: CareerFilters): boolean {
  if (filters.types.length && !filters.types.includes(job.type)) return false
  if (filters.locations.length && !job.locations.some((l) => filters.locations.includes(l))) return false
  if (!matchesIntl(job, filters.intl)) return false
  if (
    filters.levels.length &&
    !job.studyLevels.includes("any") &&
    !job.studyLevels.some((l) => filters.levels.includes(l))
  )
    return false
  if (filters.industries.length && !(job.industryKey && filters.industries.includes(job.industryKey))) return false
  return matchesSearch(job, filters.q)
}

/** Filtered and sorted view of the board. */
export function applyFilters(jobs: Job[], filters: CareerFilters): Job[] {
  return sortJobs(
    jobs.filter((job) => matchesFilters(job, filters)),
    filters.sort,
  )
}

/**
 * Roles that only the "confirmed international" filter is hiding — the ones
 * that haven't said either way. Drives the "show unconfirmed roles too" offer.
 */
export function countHiddenOnlyByIntl(jobs: Job[], filters: CareerFilters): number {
  if (filters.intl !== "yes") return 0
  return jobs.filter(
    (job) => !matchesFilters(job, filters) && matchesFilters(job, { ...filters, intl: "maybe" }),
  ).length
}

export type Facet<K extends string = string> = { key: K; label: string; count: number }

/** Industries present in the data, alphabetical, case-insensitively merged. */
export function getIndustryFacets(jobs: Job[]): Facet[] {
  const facets = new Map<string, Facet>()
  for (const job of jobs) {
    if (!job.industryKey || !job.industry) continue
    const existing = facets.get(job.industryKey)
    if (existing) existing.count++
    else facets.set(job.industryKey, { key: job.industryKey, label: job.industry, count: 1 })
  }
  return [...facets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/** Counts per canonical value, in canonical order, omitting empty ones. */
export function getTypeFacets(jobs: Job[]): Facet<JobType>[] {
  return JOB_TYPES.map((key) => ({
    key,
    label: JOB_TYPE_LABEL[key],
    count: jobs.filter((j) => j.type === key).length,
  })).filter((f) => f.count > 0)
}

export function getLocationFacets(jobs: Job[]): Facet<JobLocation>[] {
  return JOB_LOCATIONS.map((key) => ({
    key,
    label: JOB_LOCATION_LABEL[key],
    count: jobs.filter((j) => j.locations.includes(key)).length,
  })).filter((f) => f.count > 0)
}

export function getStudyLevelFacets(jobs: Job[]): Facet<StudyLevel>[] {
  return STUDY_LEVELS.filter((l) => l !== "any").map((key) => ({
    key,
    label: STUDY_LEVEL_LABEL[key],
    // "any" roles are open to every level, so they count toward each pill.
    count: jobs.filter((j) => j.studyLevels.includes(key) || j.studyLevels.includes("any")).length,
  })).filter((f) => f.count > 0)
}
