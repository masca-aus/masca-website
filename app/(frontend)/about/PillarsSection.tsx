'use client'

import { useRef, type ReactNode } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import Link from "next/link"

// The three pillars, mission statements verbatim. Each card floods with its
// brand colour on hover — the state-card idiom from the home page. Cares is a
// real link (MASCA Care has its own page); the others are informational.
type Pillar = {
  key: string
  name: string
  sub: string
  mission: string
  href?: string
  /** Hover flood colour */
  bg: string
  /** Text colour once flooded */
  fg: string
}

const PILLARS: Pillar[] = [
  {
    key: "careers",
    name: "MASCA Careers",
    sub: "Professional Development",
    mission:
      "To develop Malaysian students with the necessary skills, knowledge, and character to become the leaders of tomorrow.",
    bg: "#010066",
    fg: "#FFFFFF",
  },
  {
    key: "cares",
    name: "MASCA Cares",
    sub: "Welfare and Advocacy",
    mission:
      "To represent, champion, and advocate for our Malaysian students’ welfare and interests.",
    href: "/care",
    bg: "#CC0001",
    fg: "#FFFFFF",
  },
  {
    key: "unites",
    name: "MASCA Unites",
    sub: "Community and Nation-Building",
    mission:
      "To facilitate the interaction and unification of Malaysian students across different backgrounds, faiths, and beliefs.",
    bg: "#FFCC00",
    fg: "#00004D",
  },
]

export default function PillarsSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(".pillar-card", {
      opacity: 0,
      y: 32,
      duration: 0.55,
      stagger: 0.08,
      ease: "entranceEase",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
      },
    })
  }, { scope: containerRef })

  return (
    <section className="bg-gray-100">
      <div className="container section-pad flex flex-col gap-8">

        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">What we do</span>
          <h2 className="title text-blue-600">Three pillars, one home away from home</h2>
        </header>

        <p className="max-w-2xl text-gray-700">
          Every MASCA initiative stands on one of three pillars — each with its
          own mission, all carrying the same spirit.
        </p>

        <div
          ref={containerRef}
          className="grid grid-cols-1 auto-rows-[1fr] gap-4 md:grid-cols-3"
        >
          {PILLARS.map((pillar) => (
            <PillarCard key={pillar.key} pillar={pillar} />
          ))}
        </div>

      </div>
    </section>
  )
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const cardRef = useRef<HTMLElement & HTMLAnchorElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useGSAP(() => {
    // Paused hover timeline: play() on enter, reverse() on leave — reverse()
    // restores each element's recorded original colours automatically.
    tl.current = gsap.timeline({ paused: true })
      .to(cardRef.current, {
        backgroundColor: pillar.bg,
        borderColor: pillar.bg,
        y: -8,
        duration: 0.3,
        ease: "none",
        boxShadow: "var(--shadow-lg)",
      })
      .to(cardRef.current!.querySelectorAll(".card-text"), {
        color: pillar.fg,
        duration: 0.3,
        ease: "entranceEase",
      }, 0)
      .to(cardRef.current!.querySelector(".card-star"), {
        fill: pillar.fg,
        duration: 0.3,
        ease: "entranceEase",
      }, 0)
  }, { scope: cardRef })

  const interactions = {
    onMouseEnter: () => tl.current?.play(),
    onMouseLeave: () => tl.current?.reverse(),
    onFocus: () => tl.current?.play(),
    onBlur: () => tl.current?.reverse(),
  }

  const cardClasses =
    "relative h-full overflow-hidden flex flex-col gap-3 bg-white border border-gray-300 rounded-lg p-6 shadow-sm"

  const inner = (
    <>
      <NorthStar color={pillar.bg} className="absolute -bottom-2 -right-3 h-16 w-16 opacity-40" />
      <span className="card-text eyebrow text-gray-700">{pillar.sub}</span>
      <span className="card-text text-xl font-extrabold text-blue-600 md:text-2xl">
        {pillar.name}
      </span>
      <p className="card-text text-gray-700">{pillar.mission}</p>
    </>
  )

  return (
    // Entrance reveal drives the wrapper's transform; the hover lift drives the
    // inner element's — separate elements so a hover mid-reveal can't capture a
    // transient y as its resting value (same split as the state cards).
    <div className="pillar-card h-full">
      {pillar.href ? (
        <Link
          ref={cardRef}
          href={pillar.href}
          {...interactions}
          className={`${cardClasses} focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-red-600`}
        >
          {inner}
          <span className="card-text text-caption font-bold text-red-600 mt-auto pt-2">
            Explore MASCA Care <span aria-hidden>&rarr;</span>
          </span>
        </Link>
      ) : (
        <article ref={cardRef} {...interactions} className={cardClasses}>
          {inner}
        </article>
      )}
    </div>
  )
}

// 4-point sparkle, borrowed from the states section: control points pulled
// toward center create the concave pinch.
function NorthStar({ color, className }: { color: string; className?: string }): ReactNode {
  const d = "M50 0 C54 30 70 46 100 50 C70 54 54 70 50 100 C46 70 30 54 0 50 C30 46 46 30 50 0 Z"

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path className="card-star" d={d} fill={color} />
    </svg>
  )
}
