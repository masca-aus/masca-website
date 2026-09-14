'use client'

import { useId, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { LEGEND, PILL_IDLE } from "./boardStyles"
import SelectField from "./SelectField"

// Prev / page picker / Next under the list. A select rather than a row of
// page numbers: it jumps straight to any page and fits the narrow list column
// beside the details panel.

export default function BoardPagination({
  page,
  count,
  from,
  to,
  total,
  onChange,
}: {
  page: number
  count: number
  /** 1-based positions of the first and last role on this page. */
  from: number
  to: number
  total: number
  onChange: (page: number) => void
}) {
  const id = useId()
  const go = (next: number) => {
    if (next >= 1 && next <= count && next !== page) onChange(next)
  }

  return (
    <nav
      aria-label="Pages of roles"
      className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-4"
    >
      <p aria-live="polite" aria-atomic="true" className="text-body-sm text-gray-700">
        <span className="sr-only">Showing roles </span>
        <span className="font-bold">
          {from}–{to}
        </span>{" "}
        of {total}
      </p>

      <div className="flex items-center gap-2">
        <StepButton label="Previous page" disabled={page === 1} onClick={() => go(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden />
        </StepButton>
        <SelectField id={id} label="Page" value={page} onChange={(e) => go(Number(e.target.value))} className="pl-3 pr-9">
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <span className={LEGEND}>of {count}</span>
        <StepButton label="Next page" disabled={page === count} onClick={() => go(page + 1)}>
          <ChevronRight className="size-4" aria-hidden />
        </StepButton>
      </div>
    </nav>
  )
}

/** aria-disabled rather than disabled, so the button keeps focus when it becomes the last page. */
function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-pill border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        disabled ? "cursor-not-allowed border-gray-300 bg-white text-gray-300" : PILL_IDLE
      }`}
    >
      {children}
    </button>
  )
}
