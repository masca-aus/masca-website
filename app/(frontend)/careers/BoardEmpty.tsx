import type { ReactNode } from "react"

// The board's empty states, in the EmptyYearbook recipe from /committee: a
// brush-script line in brand red, a short gray paragraph, one or two actions.
// Public copy never mentions Google, sheet IDs or status codes.

export type BoardEmptyVariant =
  | "unconfigured"
  | "unavailable"
  | "none"
  | "no-match"
  | "no-match-intl"
  | "no-match-search"

const COPY: Record<BoardEmptyVariant, { accent: string; body: string }> = {
  unconfigured: {
    accent: "the board's still being pinned up",
    body: "The Careers team is loading the first batch of roles. Check back soon — or tell us about one you'd like to see.",
  },
  unavailable: {
    accent: "the board took a teh tarik break",
    body: "We couldn't reach the listings just now. They'll be back within a few minutes — or tell us about a role you'd like to see.",
  },
  none: {
    accent: "nothing on the board yet, lah",
    body: "The Careers team refreshes this list through the semester. Check back soon — or tell us where you'd love to work and we'll go knocking.",
  },
  "no-match": {
    accent: "no roles match that combo",
    body: "Try dropping a filter or two — or clear the lot and start fresh.",
  },
  "no-match-intl": {
    accent: "nothing confirmed for international students right now",
    body: "", // filled from `detail`
  },
  "no-match-search": {
    accent: "", // filled from `detail`
    body: "Try a company, a role type like “intern”, or a tag like “finance”.",
  },
}

export default function BoardEmpty({
  variant,
  detail,
  actions,
  compact = false,
}: {
  variant: BoardEmptyVariant
  /** Search query or unsure-role count, depending on the variant. */
  detail?: string | number
  actions?: ReactNode
  /** Inside the board (no full-section padding). */
  compact?: boolean
}) {
  const copy = COPY[variant]
  const accent =
    variant === "no-match-search" ? `nothing for “${String(detail ?? "").trim()}”` : copy.accent
  const body =
    variant === "no-match-intl"
      ? `But ${detail} ${Number(detail) === 1 ? "role hasn't" : "roles haven't"} said either way. Worth a look — and worth an email to ask.`
      : copy.body

  return (
    <div
      className={`flex flex-col items-center gap-6 text-center ${compact ? "py-16" : "container py-32"}`}
      data-variant={variant}
    >
      <span className="-rotate-2 font-accent text-3xl leading-tight text-red-600 md:text-4xl">{accent}</span>
      <p className="max-w-md text-gray-700">{body}</p>
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-4">{actions}</div>}
      {(variant === "unconfigured" || variant === "unavailable") && (
        <p className="text-caption text-gray-700">Committee? See /careers/health.</p>
      )}
    </div>
  )
}
