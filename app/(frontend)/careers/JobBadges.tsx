import { Clock, Globe, GraduationCap, Info, Lock, Star } from "lucide-react"

import {
  JOB_TYPE_LABEL,
  STUDY_LEVEL_LABEL,
  WORK_MODE_LABEL,
  formatClosesLabel,
  type Job,
  type WorkMode,
} from "@/utils/careers"

// Small, text-first chips shared by the card and the details panel. Colour is
// never the only signal: every chip carries words a screen reader gets too.
// Where a role is stays plain text ("Melbourne, VIC") — see locationSummary.

const BADGE =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-bold"

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
  // Blue text on the yellow tint: yellow-800 on yellow-50 is only 2.9:1.
  return (
    <span className={`${BADGE} bg-yellow-50 text-blue-900`}>
      <GraduationCap className="size-3" aria-hidden />
      {STUDY_LEVEL_LABEL[named[0]]}
      {named.length > 1 && (
        <>
          <span aria-hidden> +{named.length - 1}</span>
          <span className="sr-only">, and {named.length - 1} more</span>
        </>
      )}
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

/** On-site / Hybrid / Remote, in the same calm gray as the type chip. */
export function WorkModePill({ mode }: { mode: WorkMode }) {
  return <span className={`${BADGE} bg-gray-100 text-gray-700`}>{WORK_MODE_LABEL[mode]}</span>
}

/** "Melbourne, VIC · Hybrid", "Malaysia" or "Remote" — the one-line summary for cards. */
export function locationSummary(job: Pick<Job, "location" | "workMode">): string {
  const mode = job.workMode ? WORK_MODE_LABEL[job.workMode] : ""
  return [job.location, mode].filter(Boolean).join(" · ")
}
