'use client'

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import type { CommitteeMember } from "@/utils/committee"

/**
 * The landing-page tease for /committee: a handful of real committee portraits
 * fanned out like snapshots pulled from a yearbook. Cards deal themselves in on
 * scroll and the fan spreads on hover. Decorative — the CTA button is the link.
 */
export default function YearbookStack({ members }: { members: CommitteeMember[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const hoverTl = useRef<gsap.core.Timeline | null>(null)

  const n = members.length
  const mid = (n - 1) / 2
  const centerIndex = Math.round(mid)

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".polaroid")

    // Place the fan from measured widths so it fits whatever column it lands in.
    // Rotation is symmetric around the centre card; x-spacing auto-shrinks on
    // narrow screens. Re-run on resize so the fan reflows.
    const layout = () => {
      if (cards.length === 0) return
      const stageW = stageRef.current?.offsetWidth ?? 0
      const cardW = cards[0]?.offsetWidth ?? 0
      const step = Math.min(74, (stageW - cardW) / Math.max(n - 1, 1))

      cards.forEach((card, i) => {
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: (i - mid) * step,
          rotation: (i - mid) * 7,
          transformOrigin: "center center",
          zIndex: Math.round(n - Math.abs(i - mid)), // centre card on top
        })
      })

      // Rebuild the hover-spread timeline against the fresh spacing.
      hoverTl.current?.kill()
      const tl = gsap.timeline({ paused: true })
      cards.forEach((card, i) => {
        tl.to(card, {
          x: (i - mid) * step * 1.5,
          rotation: (i - mid) * 11,
          duration: 0.4,
          ease: "entranceEase",
        }, 0)
      })
      tl.to(cards[centerIndex], { y: -16, boxShadow: "var(--shadow-brand)" }, 0)
      hoverTl.current = tl
    }

    layout()

    const mm = gsap.matchMedia()

    // Deal the cards in; x/rotation are absent from the vars so the fan layout
    // set above is preserved throughout the tween.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (cards.length === 0) return
      gsap.from(cards, {
        autoAlpha: 0,
        y: 60,
        scale: 0.9,
        duration: 0.6,
        stagger: 0.08,
        ease: "entranceEase",
        scrollTrigger: { trigger: stageRef.current, start: "top 80%" },
      })
    })

    // Hand-drawn loop arrow draws itself in — the site's signature scroll motion.
    gsap.effects.writeInOnScroll(".yearbook-doodle", { trigger: stageRef.current })

    window.addEventListener("resize", layout)
    return () => window.removeEventListener("resize", layout)
    // Scope to the wrapper (not stageRef) so `.yearbook-doodle` — a sibling of
    // the stage — stays inside the scope and the draw-in resolves it.
  }, { scope: rootRef })

  return (
    <div ref={rootRef} className="relative flex justify-center lg:justify-end">
      {/* Hand-drawn nudge curling into the stack (mirrors MascaCare). */}
      <div className="pointer-events-none absolute -top-12 left-0 z-20 flex items-start gap-1 -rotate-6 md:-top-14 lg:left-4" aria-hidden>
        <span className="font-accent text-2xl leading-none text-red-600 md:text-3xl">
          the people behind it all
        </span>
        <LoopArrow className="w-11 shrink-0 text-red-600 md:w-12" />
      </div>

      <div
        ref={stageRef}
        onMouseEnter={() => hoverTl.current?.play()}
        onMouseLeave={() => hoverTl.current?.reverse()}
        className="relative h-90 w-full max-w-xl md:h-105"
      >
        {members.map((member, i) => (
          <figure
            key={member.id}
            className="polaroid absolute left-1/2 top-1/2 w-36 rounded-sm bg-white p-2.5 pb-6 shadow-lg sm:w-44"
          >
            {i === centerIndex && (
              // A strip of "washi tape" across the top card's corner.
              <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 rounded-xs bg-yellow-500/80" aria-hidden />
            )}

            <div className="relative aspect-3/4 overflow-hidden rounded-xs bg-blue-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.img}
                alt={member.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <figcaption className="mt-2 flex flex-col items-center text-center">
              <span className="font-accent text-2xl leading-none text-blue-600">
                {member.name.split(" ")[0]}
              </span>
              <span className="text-caption text-gray-700">{member.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

// Doodle-style looping arrow that curls and points down-right (into the stack).
function LoopArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 110"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path className="yearbook-doodle" d="M6 24 C 34 2 76 4 80 38 C 82 56 58 60 56 42 C 55 30 74 31 80 45 C 92 72 96 84 108 94" />
      <path className="yearbook-doodle" d="M90 92 L108 94 L102 74" />
    </svg>
  )
}
