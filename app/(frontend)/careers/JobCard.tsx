'use client'

import { memo, type KeyboardEvent, type MouseEvent } from "react"
import { Earth } from "lucide-react"

import type { Job } from "@/utils/careers"
import CompanyMark from "./CompanyMark"
import {
  ClosingChip,
  FeaturedBadge,
  NewBadge,
  StudyLevelBadge,
  TypeBadge,
  WorkingRightsBadge,
  locationSummary,
} from "./JobBadges"

// One row of the board. A button (not a link) so the desktop panel can swap
// without a navigation; the details panel offers a copyable deep link. The
// hover lift is CSS: a few hundred paused GSAP tweens would buy nothing here.

export default memo(JobCard)

function JobCard({
  job,
  selected,
  tabIndex,
  onSelect,
}: {
  job: Job
  selected: boolean
  /** Roving tabindex: only one card is in the tab order. */
  tabIndex: 0 | -1
  /** `element` is the card itself, so a modal can hand focus back to it. */
  onSelect: (job: Job, viaKeyboard: boolean, element: HTMLElement) => void
}) {
  const location = locationSummary(job)

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // detail is 0 for keyboard "clicks" (Enter/Space).
    onSelect(job, event.detail === 0, event.currentTarget)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(job, true, event.currentTarget)
    }
  }

  return (
    <li>
      <button
        type="button"
        data-job-id={job.id}
        tabIndex={tabIndex}
        aria-current={selected ? "true" : undefined}
        aria-controls="job-detail"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`job-card block w-full cursor-pointer rounded-2xl border-2 bg-white p-4 text-left shadow-md transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-0.5 hover:border-blue-600 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
          selected ? "border-blue-600 bg-blue-50" : "border-transparent"
        }`}
      >
        <div className="flex gap-3">
          <CompanyMark name={job.company} logoUrl={job.logoUrl} />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* The chip wraps beneath the title on narrow phones rather than squeezing it. */}
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h3 className="line-clamp-2 min-w-0 flex-1 basis-40 text-body font-bold leading-tight text-blue-600">
                {job.title}
              </h3>
              <ClosingChip job={job} />
            </div>

            <p className="truncate text-body-sm text-gray-700">
              {job.company}
              {location && <span className="text-gray-700/80"> · {location}</span>}
            </p>

            {job.country && (
              <p className="flex items-center gap-1.5 text-caption text-gray-700/80">
                <Earth className="size-3.5 shrink-0" aria-hidden />
                {job.country.label}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {job.featured && <FeaturedBadge />}
              <WorkingRightsBadge value={job.international} compact />
              <TypeBadge type={job.type} />
              <StudyLevelBadge levels={job.studyLevels} />
            </div>

            {(job.isNew || job.addedLabel) && (
              <p className="flex items-center gap-2 text-caption text-gray-700">
                {job.isNew && <NewBadge />}
                {job.addedLabel && <span>{job.addedLabel}</span>}
              </p>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
