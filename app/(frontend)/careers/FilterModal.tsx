'use client'

import { useRef, useState, type ReactNode, type RefObject } from "react"
import { Globe } from "lucide-react"

import Button from "@/components/Button"
import { countActiveFilters, type CareerFilters, type Facet } from "@/utils/careerFilters"
import type { BoardFacets } from "./BoardToolbar"
import { INTL_LABEL, LEGEND, NEXT_INTL, PILL_ACTIVE, PILL_BASE, PILL_IDLE, toggle } from "./boardStyles"
import ModalShell, { useRequestClose } from "./ModalShell"

// The filter sheet, opened from the toolbar's Filters button. Pills apply as
// they're tapped — the list updates behind the overlay and the Done button
// carries the live count — so there is no Apply step to forget.

const INDUSTRY_PREVIEW = 10

export default function FilterModal({
  filters,
  facets,
  visible,
  total,
  onChange,
  onClear,
  onClose,
  returnFocusRef,
}: {
  filters: CareerFilters
  facets: BoardFacets
  /** Roles matching the current filters and search. */
  visible: number
  total: number
  onChange: (patch: Partial<CareerFilters>) => void
  /** Clears every filter and the search box. */
  onClear: () => void
  onClose: () => void
  returnFocusRef: RefObject<HTMLElement | null>
}) {
  const [allIndustries, setAllIndustries] = useState(false)
  const intlOn = filters.intl !== "off"
  const industries = allIndustries ? facets.industries : facets.industries.slice(0, INDUSTRY_PREVIEW)
  const matches = visible === total ? `All ${total} roles` : `${visible} of ${total} roles`

  return (
    <ModalShell
      labelledBy="filter-modal-title"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      size="lg"
      footer={<SheetFooter active={countActiveFilters(filters)} visible={visible} onClear={onClear} />}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="filter-modal-title" className="text-h2 font-bold leading-tight text-blue-600">
              Filters
            </h2>
            <p role="status" aria-live="polite" aria-atomic="true" className="text-body-sm text-gray-700">
              {matches}
            </p>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${LEGEND} mb-2`}>Working rights</legend>
          <button
            type="button"
            aria-pressed={intlOn}
            onClick={() => onChange({ intl: NEXT_INTL[filters.intl] })}
            className={`${PILL_BASE} inline-flex items-center gap-2 self-start ${intlOn ? PILL_ACTIVE : PILL_IDLE}`}
          >
            <Globe className="size-4" aria-hidden />
            {INTL_LABEL[filters.intl].full}
          </button>
        </fieldset>

        <PillGroup
          legend="Type"
          facets={facets.types}
          selected={filters.types}
          onToggle={(v) => onChange({ types: toggle(filters.types, v) })}
        />
        <PillGroup
          legend="Country"
          facets={facets.countries}
          selected={filters.countries}
          onToggle={(v) => onChange({ countries: toggle(filters.countries, v) })}
        />
        <PillGroup
          legend="State"
          facets={facets.states}
          selected={filters.states}
          onToggle={(v) => onChange({ states: toggle(filters.states, v) })}
        />
        <PillGroup
          legend="City"
          facets={facets.cities}
          selected={filters.cities}
          onToggle={(v) => onChange({ cities: toggle(filters.cities, v) })}
        />
        <PillGroup
          legend="Work mode"
          facets={facets.modes}
          selected={filters.modes}
          onToggle={(v) => onChange({ modes: toggle(filters.modes, v) })}
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
    </ModalShell>
  )
}

/** Clear all + the Done button, pinned below the scrolling body. */
function SheetFooter({ active, visible, onClear }: { active: number; visible: number; onClear: () => void }) {
  const requestClose = useRequestClose()
  const doneRef = useRef<HTMLButtonElement>(null)

  // "Clear all" unmounts itself; park focus on Done so it stays inside the sheet.
  const clearAll = () => {
    onClear()
    doneRef.current?.focus()
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {active > 0 && (
        <Button variant="ghost" type="button" onClick={clearAll} className="mr-auto text-body-sm">
          Clear all
        </Button>
      )}
      <Button ref={doneRef} variant="primary" type="button" onClick={requestClose}>
        {visible === 0 ? "Close" : `Show ${visible} ${visible === 1 ? "role" : "roles"}`}
      </Button>
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
  trailing?: ReactNode
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
              <span className="ml-1.5 text-caption font-semibold opacity-80" aria-hidden>
                {facet.count}
              </span>
              <span className="sr-only">
                , {facet.count} {facet.count === 1 ? "role" : "roles"}
              </span>
            </button>
          )
        })}
        {trailing}
      </div>
    </fieldset>
  )
}