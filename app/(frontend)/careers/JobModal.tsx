'use client'

import { useCallback, useEffect, useRef, type RefObject } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"
import { X } from "lucide-react"

import type { Job } from "@/utils/careers"
import JobDetails from "./JobDetails"

// Mobile-only bottom sheet for a listing — the MemberModal recipe from the
// committee page (overlay, GSAP in/out, Escape, scroll lock) plus a focus trap
// and focus return, which a sheet a student reads for a while needs.

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

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
  const overlayRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  // Fade with `opacity`, not `autoAlpha`: autoAlpha starts at
  // visibility:hidden, which makes the initial focus() below a no-op.
  useGSAP(() => {
    tl.current = gsap.timeline()
      .from(overlayRef.current, { opacity: 0, duration: 0.25, ease: "none" })
      .from(boxRef.current, { opacity: 0, y: 32, duration: 0.4, ease: "entranceEase" }, 0.05)
  }, { scope: overlayRef })

  const requestClose = useCallback(() => {
    const t = tl.current
    if (!t) return onClose()
    t.eventCallback("onReverseComplete", onClose)
    t.timeScale(1.5).reverse()
  }, [onClose])

  useEffect(() => {
    // The opener sets the ref before the sheet mounts; read it now, since the
    // ref may point elsewhere by the time the cleanup runs.
    const returnTo = returnFocusRef.current
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== "Tab" || !boxRef.current) return
      // Keep Tab / Shift+Tab inside the sheet.
      const focusable = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)

    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
      returnTo?.focus()
    }
  }, [requestClose, returnFocusRef])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-blue-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        ref={boxRef}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-6 pt-14 shadow-brand sm:max-w-xl sm:rounded-2xl sm:p-8 sm:pt-14"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-pill bg-white/80 px-3 py-1.5 text-caption font-bold text-gray-700 backdrop-blur-sm transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Close <X className="size-3.5" aria-hidden />
        </button>

        <JobDetails job={job} headingId="job-modal-title" stickyActions />
      </div>
    </div>
  )
}
