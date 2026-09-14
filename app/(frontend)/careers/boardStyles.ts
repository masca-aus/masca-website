import type { IntlFilter } from "@/utils/careerFilters"

// Looks and one-liners shared by the toolbar, the filter sheet and the pager,
// so a pill or a field reads the same wherever it appears on the board.

export const PILL_BASE =
  "min-h-10 rounded-pill border-2 px-4 py-1.5 text-body-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
export const PILL_ACTIVE = "border-blue-600 bg-blue-600 text-white"
export const PILL_IDLE = "border-blue-100 bg-white text-blue-600 hover:border-blue-600"

export const FIELD =
  "rounded-md border-2 border-blue-100 bg-white px-4 py-3 text-body text-black outline-none transition-colors placeholder:text-gray-300 focus:border-blue-600 focus:shadow-sm"
export const LEGEND = "text-body-sm font-bold text-gray-700"

/** The toggle cycles off → yes; from the empty state's "maybe" a tap tightens back to yes. */
export const NEXT_INTL: Record<IntlFilter, IntlFilter> = { off: "yes", yes: "off", maybe: "yes" }
export const INTL_LABEL: Record<IntlFilter, { full: string; short: string }> = {
  off: { full: "Open to international students", short: "Intl OK" },
  yes: { full: "Open to international students", short: "Intl OK" },
  maybe: { full: "Open to international students, incl. unconfirmed", short: "Intl OK + unconfirmed" },
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}
