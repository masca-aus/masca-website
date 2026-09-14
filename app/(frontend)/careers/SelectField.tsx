'use client'

import type { ReactNode, SelectHTMLAttributes } from "react"

import { FIELD, LEGEND } from "./boardStyles"

/**
 * A labelled native select in the board's field style, with a drawn chevron.
 * `fill` stretches it to its container below sm and tucks the label away for
 * screen readers only — the options ("Newest first", "10 per page") already
 * say what the field is, and a phone row has no room for both.
 */
export default function SelectField({
  id,
  label,
  children,
  className = "",
  fill = false,
  ...props
}: {
  id: string
  label: string
  children: ReactNode
  fill?: boolean
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`flex items-center gap-2 ${fill ? "min-w-0" : ""}`}>
      <label htmlFor={id} className={`${LEGEND} ${fill ? "sr-only sm:not-sr-only" : ""}`}>
        {label}
      </label>
      <div className={`relative ${fill ? "min-w-0 flex-1 sm:flex-none" : ""}`}>
        <select
          id={id}
          {...props}
          className={`${FIELD} appearance-none py-2 pr-10 text-body-sm font-bold ${fill ? "w-full" : ""} ${className}`}
        >
          {children}
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
  )
}
