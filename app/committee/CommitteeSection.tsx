'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"
import { X } from "lucide-react"

import type { CommitteeMember } from "@/utils/committee"
import CommitteeCard from "./CommitteeCard"

export default function CommitteeSection({
  members,
  years,
}: {
  members: CommitteeMember[]
  years: string[]
}) {
  // Default to the most recent term (years arrive newest-first).
  const [activeYear, setActiveYear] = useState<string>(years[0])
  const [selected, setSelected] = useState<CommitteeMember | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)

  // `members` is already sorted by `order` on the server; we only filter.
  const visible = useMemo(
    () => members.filter((m) => m.year === activeYear),
    [members, activeYear],
  )

  // Staggered reveal as the grid scrolls into view; re-runs on year change so
  // a freshly-filtered set animates in too.
  useGSAP(() => {
    gsap.from(".member-card", {
      opacity: 0,
      y: 32,
      scale: 0.96,
      duration: 0.55,
      stagger: 0.06,
      ease: "entranceEase",
      scrollTrigger: {
        trigger: gridRef.current,
        start: "top 85%",
      },
    })
  }, { scope: gridRef, dependencies: [activeYear] })

  return (
    <section>
      <div className="container py-24 flex flex-col gap-10">

        {/* Year navigation — folder-style tabs sitting on the grid surface.
            Driven entirely by the `years` array, so future terms append for
            free. */}
        <div
          role="tablist"
          aria-label="Committee year"
          className="flex flex-wrap items-end gap-1 border-b border-gray-300"
        >
          {years.map((year) => {
            const active = year === activeYear
            return (
              <button
                key={year}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveYear(year)}
                className={`-mb-px rounded-t-lg border border-b-0 px-5 py-2.5 text-body-sm font-bold transition-colors ${
                  active
                    ? "border-gray-300 bg-gray-100 text-blue-600"
                    : "border-transparent bg-transparent text-gray-700 hover:text-blue-600"
                }`}
              >
                {year}
              </button>
            )
          })}
        </div>

        {/* Card grid — 2 columns on mobile, 3 on desktop. */}
        <div
          ref={gridRef}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {visible.map((member) => (
            <CommitteeCard key={member.id} member={member} onOpen={setSelected} />
          ))}
        </div>

      </div>

      {selected && (
        <MemberModal member={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  )
}

function MemberModal({
  member,
  onClose,
}: {
  member: CommitteeMember
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  // Build the open timeline and play it in on mount.
  useGSAP(() => {
    tl.current = gsap.timeline()
      .from(overlayRef.current, { autoAlpha: 0, duration: 0.25, ease: "none" })
      .from(boxRef.current, {
        autoAlpha: 0,
        y: 24,
        scale: 0.96,
        duration: 0.4,
        ease: "entranceEase",
      }, 0.05)
  }, { scope: overlayRef })

  // Play the open timeline in reverse, then unmount once it finishes.
  const requestClose = useCallback(() => {
    const t = tl.current
    if (!t) return onClose()
    t.eventCallback("onReverseComplete", onClose)
    t.timeScale(1.5).reverse()
  }, [onClose])

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [requestClose])

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name}, ${member.role}`}
      onClick={(e) => {
        // Backdrop click closes; clicks inside the box are ignored.
        if (e.target === e.currentTarget) requestClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/60 backdrop-blur-sm p-4 sm:p-6"
    >
      <div
        ref={boxRef}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-white shadow-brand md:max-h-[80vh] md:max-w-6xl md:flex-row md:overflow-hidden"
      >
        {/* Minimal close control, top-right */}
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-pill bg-white/80 px-3 py-1.5 text-caption font-bold text-gray-700 backdrop-blur-sm transition-colors hover:text-blue-600"
        >
          Close <X className="h-3.5 w-3.5" aria-hidden />
        </button>

        {/* Portrait — sharp top corners on mobile, left edge on desktop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.img}
          alt={member.name}
          className="aspect-[4/5] w-full rounded-t-2xl object-cover md:h-full md:w-2/5 md:shrink-0 md:rounded-l-2xl md:rounded-tr-none"
        />

        <div className="flex flex-col gap-6 p-6 md:flex-1 md:overflow-y-auto md:p-8">
          {/* Name + role, stacked */}
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-bold text-blue-600 leading-tight">
              {member.name}
            </h2>
            <span className="text-body-sm font-medium text-gray-700">
              {member.role}
            </span>
          </div>

          {/* Bio — tight, legible reading block */}
          <p className="text-body-sm leading-relaxed text-black/80">
            {member.bio}
          </p>

          {/* Minimalist LinkedIn link */}
          {member.linkedin_url && (
            <a
              href={member.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 text-body-sm font-bold text-blue-600 transition-colors hover:text-blue-900"
            >
              <LinkedInIcon className="h-4 w-4" />
              Connect on LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// Lucide dropped its brand icons, and the codebase already favours inline
// SVGs (see the NorthStar in the states section), so the LinkedIn mark lives
// here as a tiny currentColor glyph.
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}
