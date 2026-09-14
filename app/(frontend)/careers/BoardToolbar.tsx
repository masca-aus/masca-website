'use client'

import { useId, useState } from "react"
import { Globe, Search, SlidersHorizontal } from "lucide-react"

import Button from "@/components/Button"
import {
  countActiveFilters,
  hasAnyFilter,
  type CareerFilters,
  type Facet,
} from "@/utils/careerFilters"
import type { JobLocation, JobSort, JobType, StudyLevel } from "@/utils/careers"

// Search, the international-students toggle, the pill groups and the sort
// control. On phones the pill groups collapse behind a "Filters" button; the
// toggle stays in view because it is the one filter every visa holder taps.

export type BoardFacets = {
  types: Facet<JobType>[]
  locations: Facet<JobLocation>[]
  levels: Facet<StudyLevel>[]
  industries: Facet[]
}

const INDUSTRY_PREVIEW = 10

const PILL_BASE =
  "rounded-pill border-2 px-4 py-1.5 text-body-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
const PILL_ACTIVE = "border-blue-600 bg-blue-600 text-white"
const PILL_IDLE = "border-blue-100 bg-white text-blue-600 hover:border-blue-600"

const FIELD =
  "rounded-md border-2 border-blue-100 bg-white px-4 py-3 text-body text-black outline-none transition-colors placeholder:text-gray-300 focus:border-blue-600 focus:shadow-sm"
const LEGEND = "text-body-sm font-bold text-gray-700"

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function BoardToolbar({
  filters,
  searchValue,
  onSearchChange,
  onChange,
  onClear,
  facets,
  total,
  visible,
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
}) {
  const [open, setOpen] = useState(false)
  const [allIndustries, setAllIndustries] = useState(false)
  const groupsId = useId()
  const sortId = useId()
  const searchId = useId()

  const active = countActiveFilters(filters)
  const filtered = hasAnyFilter(filters) || searchValue.trim() !== ""
  const intlOn = filters.intl !== "off"
  const industries = allIndustries ? facets.industries : facets.industries.slice(0, INDUSTRY_PREVIEW)

  const count =
    visible === total
      ? `${total} ${total === 1 ? "role" : "roles"}`
      : `${visible} of ${total} roles`

  return (
    <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:z-10 lg:-mx-4 lg:rounded-2xl lg:bg-gray-100/95 lg:px-4 lg:py-4 lg:backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor={searchId} className="sr-only">
          Search roles
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-700" aria-hidden />
          <input
            id={searchId}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
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

        <div className="flex gap-3">
          <button
            type="button"
            aria-pressed={intlOn}
            onClick={() => onChange({ intl: intlOn ? "off" : "yes" })}
            className={`${PILL_BASE} inline-flex items-center gap-2 py-2.5 ${intlOn ? PILL_ACTIVE : PILL_IDLE}`}
          >
            <Globe className="size-4" aria-hidden />
            <span className="hidden sm:inline">Open to international students</span>
            <span className="sm:hidden" aria-hidden>
              Intl OK
            </span>
            <span className="sr-only sm:hidden">Open to international students</span>
          </button>

          <button
            type="button"
            aria-expanded={open}
            aria-controls={groupsId}
            onClick={() => setOpen((v) => !v)}
            className={`${PILL_BASE} inline-flex items-center gap-2 py-2.5 lg:hidden ${PILL_IDLE}`}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {active > 0 && (
              <span className="rounded-pill bg-red-600 px-1.5 text-caption text-white">{active}</span>
            )}
          </button>
        </div>
      </div>

      <div id={groupsId} className={`${open ? "flex" : "hidden"} flex-col gap-4 lg:flex lg:flex-row lg:flex-wrap lg:gap-x-8 lg:gap-y-4`}>
        <PillGroup
          legend="Type"
          facets={facets.types}
          selected={filters.types}
          onToggle={(v) => onChange({ types: toggle(filters.types, v) })}
        />
        <PillGroup
          legend="Where"
          facets={facets.locations}
          selected={filters.locations}
          onToggle={(v) => onChange({ locations: toggle(filters.locations, v) })}
        />
        <PillGroup
          legend="Study level"
          facets={facets.levels}
          selected={filters.levels}
          onToggle={(v) => onChange({ levels: toggle(filters.levels, v) })}
        />
        {facets.industries.length > 0 && (
          <PillGroup
            legend="Industry"
            facets={industries}
            selected={filters.industries}
            onToggle={(v) => onChange({ industries: toggle(filters.industries, v) })}
            trailing={
              facets.industries.length > INDUSTRY_PREVIEW && !allIndustries ? (
                <button
                  type="button"
                  onClick={() => setAllIndustries(true)}
                  className={`${PILL_BASE} border-dashed ${PILL_IDLE}`}
                >
                  +{facets.industries.length - INDUSTRY_PREVIEW} more
                </button>
              ) : null
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-body-sm text-gray-700">
        <p role="status" aria-live="polite" className="font-bold">
          {count}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {filtered && (
            <Button variant="ghost" type="button" onClick={onClear} className="text-body-sm">
              Clear filters
            </Button>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className={LEGEND}>
              Sort
            </label>
            <div className="relative">
              <select
                id={sortId}
                value={filters.sort}
                onChange={(e) => onChange({ sort: e.target.value as JobSort })}
                className={`${FIELD} appearance-none py-2 pr-10 text-body-sm font-bold`}
              >
                <option value="newest">Newest first</option>
                <option value="closing">Closing soon</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700"
              >
                <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PillGroup<K extends string>({
  legend,
  facets,
  selected,
  onToggle,
  trailing,
}: {
  legend: string
  facets: Facet<K>[]
  selected: K[]
  onToggle: (value: K) => void
  trailing?: React.ReactNode
}) {
  if (facets.length === 0) return null
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LEGEND} mb-2`}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {facets.map((facet) => {
          const active = selected.includes(facet.key)
          return (
            <button
              key={facet.key}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(facet.key)}
              className={`${PILL_BASE} ${active ? PILL_ACTIVE : PILL_IDLE}`}
            >
              {facet.label}
              <span className="ml-1.5 text-caption font-semibold opacity-70" aria-label={`${facet.count} roles`}>
                {facet.count}
              </span>
            </button>
          )
        })}
        {trailing}
      </div>
    </fieldset>
  )
}
