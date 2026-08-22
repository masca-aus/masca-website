'use client'

import { useRef } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

// The three I's, definitions verbatim. A quiet editorial list after the
// colourful pillar cards: numbered rows, each heading underscored by a
// hand-drawn stroke that writes itself in on scroll.
const VALUES = [
  {
    n: "01",
    name: "Inclusivity",
    body: "To ensure every Malaysian student feels welcomed, valued, and connected.",
  },
  {
    n: "02",
    name: "Integrity",
    body: "To serve our community with transparency, accountability, and honesty.",
  },
  {
    n: "03",
    name: "Impact",
    body: "To create positive and meaningful change for our community.",
  },
]

export default function ValuesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.from(".value-row", {
      opacity: 0,
      y: 24,
      duration: 0.55,
      stagger: 0.1,
      ease: "entranceEase",
      scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
    })

    gsap.effects.writeInOnScroll(".value-underline", {
      trigger: sectionRef.current,
      stagger: 0.2,
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef}>
      <div className="container section-pad flex flex-col gap-10">

        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Our values</span>
          <h2 className="title text-blue-600">Anchored in three I&rsquo;s</h2>
        </header>

        <p className="max-w-2xl text-gray-700">
          As ambassadors of Malaysia in Australia, we carry our nation&rsquo;s
          spirit by anchoring every decision, event, and initiative in three
          core values:
        </p>

        <ol className="flex flex-col border-b border-gray-300">
          {VALUES.map((value) => (
            <li
              key={value.n}
              className="value-row grid gap-x-12 gap-y-3 border-t border-gray-300 py-8 md:grid-cols-2 md:items-center"
            >
              <div className="flex items-baseline gap-5">
                <span className="text-caption font-bold text-red-600">{value.n}</span>
                <span className="relative inline-block">
                  <span className="text-h2 font-extrabold text-blue-600">
                    {value.name}
                  </span>
                  <ValueUnderline className="absolute -bottom-2 left-0 w-full text-red-600" />
                </span>
              </div>
              <p className="text-gray-700 md:max-w-md">{value.body}</p>
            </li>
          ))}
        </ol>

      </div>
    </section>
  )
}

// Hand-drawn wavy underline; preserveAspectRatio=none lets one doodle stretch
// under headings of any width.
function ValueUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 14"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`h-2.5 ${className}`}
    >
      <path
        className="value-underline"
        d="M4 9 C 40 3, 78 12, 114 7 C 150 2, 186 10, 216 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
