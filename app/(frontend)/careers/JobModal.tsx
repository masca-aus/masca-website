'use client'

import type { RefObject } from "react"

import type { Job } from "@/utils/careers"
import JobDetails from "./JobDetails"
import ModalShell from "./ModalShell"

// Mobile-only sheet for a listing; on desktop the sticky panel shows the same
// JobDetails. The sheet chrome (overlay, focus trap, Escape) is ModalShell's.

export default function JobModal({
  job,
  onClose,
  returnFocusRef,
}: {
  job: Job
  onClose: () => void
  /** Holds the card that opened the sheet, to hand focus back on close. */
  returnFocusRef: RefObject<HTMLElement | null>
}) {
  return (
    <ModalShell labelledBy="job-modal-title" onClose={onClose} returnFocusRef={returnFocusRef}>
      <JobDetails job={job} headingId="job-modal-title" stickyActions />
    </ModalShell>
  )
}
