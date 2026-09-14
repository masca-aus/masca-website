import { Clock, Globe, GraduationCap, Info, Lock, MapPin, Star } from "lucide-react"

import {
  JOB_LOCATION_LABEL,
  JOB_TYPE_LABEL,
  STUDY_LEVEL_LABEL,
  formatClosesLabel,
  type Job,
  type JobLocation,
} from "@/utils/careers"
import { STATES } from "@/utils/states"

// Small, text-first chips shared by the card and the details panel. Colour is
// never the only signal: every chip carries words a screen reader gets too.

const BADGE =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-bold"

const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]))
const BRAND_PILL = { bg: "#010066", fg: "#FFCC00" }

/** The decisive chip for a student on a visa. `compact` shortens it for cards. */
export function WorkingRightsBadge({
  value,
  compact = false,
}: {
  value: Job["international"]
  compact?: boolean
}) {
  if (value === "yes") {
    return (
      <span className={`${BADGE} bg-blue-600 text-white`}>
        <Globe className="size-3" aria-hidden />
        {compact ? (
          <>
            <span aria-hidden>Intl OK</span>
            <span className="sr-only">Open to international students</span>
          </>
        ) : (
          "Open to international students"
        )}
      </span>
    )
  }
  if (value === "no") {
    return (
      <span className={`${BADGE} bg-gray-100 text-gray-700`}>
        <Lock className="size-3" aria-hidden />
        Citizens / PR only
      </span>
    )
  }
  return (
    <span className={`${BADGE} border border-gray-300 text-gray-700`}>
      <Info className="size-3" aria-hidden />
      Check working rights
    </span>
  )
}

/** Urgency chip: red when the clock is running out, calm blue otherwise. */
export function ClosingChip({ job }: { job: Pick<Job, "daysLeft" | "closesLabel"> }) {
  const label = formatClosesLabel(job)
  if (job.daysLeft === undefined) {
    return <span className={`${BADGE} bg-gray-100 text-gray-700`}>Rolling</span>
  }
  if (job.daysLeft === 0) {
    return (
      <span className={`${BADGE} bg-red-600 text-white`}>
        <Clock className="size-3" aria-hidden />
        {label}
      </span>
    )
  }
  if (job.daysLeft <= 7) {
    return (
      <span className={`${BADGE} bg-red-100 text-red-900`}>
        <Clock className="size-3" aria-hidden />
        {label}
      </span>
    )
  }
  return <span className={`${BADGE} bg-blue-50 text-blue-600`}>{label}</span>
}

export function TypeBadge({ type }: { type: Job["type"] }) {
  return <span className={`${BADGE} bg-gray-100 text-gray-700`}>{JOB_TYPE_LABEL[type]}</span>
}

/** First non-"any" level, with a "+n" for the rest. Nothing for "any". */
export function StudyLevelBadge({ levels }: { levels: Job["studyLevels"] }) {
  const named = levels.filter((l) => l !== "any")
  if (named.length === 0) return null
  return (
    <span className={`${BADGE} bg-yellow-50 text-yellow-800`}>
      <GraduationCap className="size-3" aria-hidden />
      {STUDY_LEVEL_LABEL[named[0]]}
      {named.length > 1 && <span aria-label={`and ${named.length - 1} more`}> +{named.length - 1}</span>}
    </span>
  )
}

export function FeaturedBadge() {
  return (
    <span className={`${BADGE} bg-yellow-500 text-blue-900`}>
      <Star className="size-3 fill-current" aria-hidden />
      Featured
    </span>
  )
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-caption font-bold text-red-600">
      <span className="size-1.5 rounded-pill bg-red-600" aria-hidden />
      New
    </span>
  )
}

/** State pills borrow the chapter colours from the events cards. */
export function LocationPill({ location }: { location: JobLocation }) {
  const label = JOB_LOCATION_LABEL[location]
  const state = STATE_BY_CODE[label]
  if (state) {
    return (
      <span className={BADGE} style={{ backgroundColor: state.bg, color: state.fg }}>
        {label}
      </span>
    )
  }
  if (location === "remote") {
    return (
      <span className={`${BADGE} bg-gray-100 text-gray-700`}>
        <MapPin className="size-3" aria-hidden />
        {label}
      </span>
    )
  }
  if (location === "malaysia") {
    return <span className={`${BADGE} bg-yellow-100 text-yellow-800`}>{label}</span>
  }
  if (location === "other") {
    return <span className={`${BADGE} border border-gray-300 text-gray-700`}>{label}</span>
  }
  return (
    <span className={BADGE} style={{ backgroundColor: BRAND_PILL.bg, color: BRAND_PILL.fg }}>
      {label}
    </span>
  )
}

/** "VIC, NSW" or "Melbourne (hybrid)" — the one-line location summary for cards. */
export function locationSummary(job: Pick<Job, "locations" | "locationNote">): string {
  if (job.locationNote) return job.locationNote
  return job.locations.map((l) => JOB_LOCATION_LABEL[l]).join(", ")
}
