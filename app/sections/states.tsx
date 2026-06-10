'use client'

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { STATES, type State } from "@/utils/states"

export default function StatesSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(".state-card", {
      opacity: 0,
      y: 32,
      duration: 0.55,
      stagger: 0.06,
      ease: "entranceEase",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
      },
    })
  }, { scope: containerRef })

  return (
    <section className="bg-gray-100">
      <div className="container py-32 flex flex-col gap-8">

        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Chapters across australia</span>
          <span className="title text-blue-600">Find your state, find your people</span>
        </header>

        <p className="text-gray-700">Each chapter is run by student leaders on the ground — pick yours to see local events, welfare contacts, and how to get involved.</p>

        {/* state boxes */}
        <div
          ref={containerRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[1fr] gap-4"
        >
          {STATES.map((state) => (
            <StateCard key={state.code} state={state} />
          ))}
        </div>

      </div>
    </section>
  )
}

function StateCard({ state }: { state: State }) {
  const cardRef = useRef<HTMLElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useGSAP(() => {
    // Paused hover timeline: play() on enter, reverse() on leave.
    // reverse() restores each element's original (recorded) color automatically.
    tl.current = gsap.timeline({ paused: true })
      .to(cardRef.current, {
        backgroundColor: state.bg,
        borderColor: state.bg,
        y: -8,
        duration: 0.3,
        ease: "none",
        boxShadow: "var(--shadow-lg)"
      })
      .to(cardRef.current!.querySelectorAll(".card-text"), {
        color: state.fg,
        duration: 0.3,
        ease: "entranceEase",
      }, 0)
      .to(cardRef.current!.querySelector(".card-star"), {
        fill: state.fg,
        duration: 0.3,
        ease: "entranceEase",
      }, 0)
  }, { scope: cardRef })

  return (
    // Entrance reveal (parent's gsap.from) drives the wrapper's transform; the
    // hover lift drives the inner article's. Keeping them on separate elements
    // means a hover mid-reveal can't capture a transient y as its resting value.
    <div className="state-card h-full">
      <article
        ref={cardRef}
        onMouseEnter={() => tl.current?.play()}
        onMouseLeave={() => tl.current?.reverse()}
        className="relative h-full overflow-hidden flex flex-col bg-white border border-gray-300 rounded-lg p-4 cursor-pointer shadow-sm"
      >
        <NorthStar color={state.bg} className="absolute bottom-1 -right-2 h-12 w-12 opacity-50" />
        <span className="card-text text-h2 font-extrabold text-blue-600">{state.code}</span>
        <span className="card-text eyebrow">{state.name}</span>
        <span className="card-text text-caption text-gray-700">{state.capital}</span>
      </article>
    </div>
  )
}

function NorthStar({ color, className }: { color: string; className?: string }) {
  // 4-point sparkle: control points pulled toward center create the concave pinch.
  const d = "M50 0 C54 30 70 46 100 50 C70 54 54 70 50 100 C46 70 30 54 0 50 C30 46 46 30 50 0 Z"

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path className="card-star" d={d} fill={color} />
    </svg>
  )
}

// function StarBurst({ color, className }: { color: string; className?: string }) {
//   const points = 8
//   const outer = 50
//   const inner = 20 // larger inner radius = shorter, blunter points
//   const cx = 50
//   const cy = 50
//
//   const coords = Array.from({ length: points * 2 }, (_, i) => {
//     const r = i % 2 === 0 ? outer : inner
//     const angle = (Math.PI / points) * i - Math.PI / 2
//     return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`
//   }).join(" ")
//
//   return (
//     <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
//       <polygon className="card-star" points={coords} fill={color} />
//     </svg>
//   )
// }