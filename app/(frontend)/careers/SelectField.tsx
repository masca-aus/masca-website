'use client'

import type { ReactNode, SelectHTMLAttributes } from "react"

import { FIELD, LEGEND } from "./boardStyles"

/** A labelled native select in the board's field style, with a drawn chevron. */
export default function SelectField({
  id,
  label,
  children,
  className = "",
  ...props
}: {
  id: string
  label: string
  children: ReactNode
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={LEGEND}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          {...props}
          className={`${FIELD} appearance-none py-2 pr-10 text-body-sm font-bold ${className}`}
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
