'use client'

import { useId, type RefObject } from "react"
import { Globe, Search, SlidersHorizontal, X } from "lucide-react"

import Button from "@/components/Button"
import {
  MAX_QUERY_LENGTH,
  PAGE_SIZES,
  countActiveFilters,
  hasAnyFilter,
  type CareerFilters,
  type Facet,
  type PageSize,
} from "@/utils/careerFilters"
import {
  JOB_LOCATION_LABEL,
  JOB_TYPE_LABEL,
  STUDY_LEVEL_LABEL,
  type JobLocation,
  type JobSort,
  type JobType,
  type StudyLevel,
} from "@/utils/careers"
import { FIELD, INTL_LABEL, NEXT_INTL, PILL_ACTIVE, PILL_BASE, PILL_IDLE, toggle } from "./boardStyles"
import SelectField from "./SelectField"

// The bar above the list: search with the Filters button beside it, the
// international-students toggle (the one filter every visa holder taps, so it
// stays out of the sheet), a chip for each applied filter, then the count,
// sort and page size. The pill groups themselves live in FilterModal and open
// on demand.

export type BoardFacets = {
  types: Facet<JobType>[]
  locations: Facet<JobLocation>[]
  levels: Facet<StudyLevel>[]
  industries: Facet[]
}

type Chip = { key: string; label: string; remove: () => void }

export default function BoardToolbar({
  filters,
  searchValue,
  onSearchChange,
  onChange,
  onClear,
  facets,
  total,
  visible,
  per,
  onPerChange,
  filtersOpen,
  onOpenFilters,
  filtersButtonRef,
}: {
  filters: CareerFilters
  /** The live input value (filters.q lags behind it while typing). */
  searchValue: string
  onSearchChange: (value: string) => void
  onChange: (patch: Partial<CareerFilters>) => void
  onClear: () => void
  facets: BoardFacets
  total: number
  visible: number
  per: PageSize
  onPerChange: (per: PageSize) => void
  filtersOpen: boolean
  onOpenFilters: () => void
  /** The Filters button, so the sheet can hand focus back to it. */
  filtersButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const sortId = useId()
  const perId = useId()
  const searchId = useId()

  const active = countActiveFilters(filters)
  const filtered = hasAnyFilter(filters) || searchValue.trim() !== ""
  const intlOn = filters.intl !== "off"
  const intlLabel = INTL_LABEL[filters.intl]
  const chips = appliedChips(filters, facets, onChange)

  const count =
    visible === total
      ? `${total} ${total === 1 ? "role" : "roles"}`
      : `${visible} of ${total} roles`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 basis-72 gap-3">
          <label htmlFor={searchId} className="sr-only">
            Search roles
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-700" aria-hidden />
            <input
              id={searchId}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={MAX_QUERY_LENGTH}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchValue) {
                  e.preventDefault()
                  onSearchChange("")
                }
              }}
              placeholder="Search roles, companies or tags…"
              className={`${FIELD} w-full pl-11`}
            />
          </div>

          <button
            ref={filtersButtonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            onClick={onOpenFilters}
            className={`${PILL_BASE} inline-flex shrink-0 items-center gap-2 py-2.5 ${active > 0 ? PILL_ACTIVE : PILL_IDLE}`}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {active > 0 && (
              <span className="rounded-pill bg-yellow-500 px-1.5 text-caption text-blue-900">
                {active}
                <span className="sr-only"> active</span>
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          aria-pressed={intlOn}
          onClick={() => onChange({ intl: NEXT_INTL[filters.intl] })}
          className={`${PILL_BASE} inline-flex items-center gap-2 py-2.5 ${intlOn ? PILL_ACTIVE : PILL_IDLE}`}
        >
          <Globe className="size-4" aria-hidden />
          <span className="hidden sm:inline">{intlLabel.full}</span>
          <span className="sm:hidden" aria-hidden>
            {intlLabel.short}
          </span>
          <span className="sr-only sm:hidden">{intlLabel.full}</span>
        </button>
      </div>

      {chips.length > 0 && (
        <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => {
                  chip.remove()
                  // The chip is about to unmount; keep keyboard focus on the board.
                  filtersButtonRef.current?.focus()
                }}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-pill bg-blue-50 px-3 text-caption font-bold text-blue-600 transition-colors hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {chip.label}
                <X className="size-3" aria-hidden />
                <span className="sr-only">, remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-body-sm text-gray-700">
        <p role="status" aria-live="polite" aria-atomic="true" className="font-bold">
          {count}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {filtered && (
            <Button variant="ghost" type="button" onClick={onClear} className="text-body-sm">
              Clear filters
            </Button>
          )}
          <SelectField id={sortId} label="Sort" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as JobSort })}>
            <option value="newest">Newest first</option>
            <option value="closing">Closing soon</option>
          </SelectField>
          <SelectField id={perId} label="Show" value={per} onChange={(e) => onPerChange(Number(e.target.value) as PageSize)}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </div>
  )
}

/** One removable chip per applied value, in the order the groups appear in the sheet. */
function appliedChips(
  filters: CareerFilters,
  facets: BoardFacets,
  onChange: (patch: Partial<CareerFilters>) => void,
): Chip[] {
  const industryLabel = (key: string) => facets.industries.find((f) => f.key === key)?.label ?? key
  return [
    ...filters.types.map((v) => ({
      key: `type:${v}`,
      label: JOB_TYPE_LABEL[v],
      remove: () => onChange({ types: toggle(filters.types, v) }),
    })),
    ...filters.locations.map((v) => ({
      key: `loc:${v}`,
      label: JOB_LOCATION_LABEL[v],
      remove: () => onChange({ locations: toggle(filters.locations, v) }),
    })),
    ...filters.levels.map((v) => ({
      key: `level:${v}`,
      label: STUDY_LEVEL_LABEL[v],
      remove: () => onChange({ levels: toggle(filters.levels, v) }),
    })),
    ...filters.industries.map((v) => ({
      key: `industry:${v}`,
      label: industryLabel(v),
      remove: () => onChange({ industries: toggle(filters.industries, v) }),
    })),
  ]
}
