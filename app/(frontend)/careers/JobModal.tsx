'use client'

import type { RefObject } from "react"

import type { Job } from "@/utils/careers"
import JobDetails, { JobActions } from "./JobDetails"
import ModalShell from "./ModalShell"

// Mobile-only sheet for a listing; on desktop the sticky panel shows the same
// JobDetails. The sheet chrome (overlay, focus trap, Escape) is ModalShell's,
// and the Apply bar rides in its pinned footer rather than the scrolling body.

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
    <ModalShell
      labelledBy="job-modal-title"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      footer={<JobActions job={job} />}
    >
      <JobDetails job={job} headingId="job-modal-title" showActions={false} />
    </ModalShell>
  )
}