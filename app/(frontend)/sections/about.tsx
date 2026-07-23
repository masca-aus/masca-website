'use client'

import { useRef } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"

// John Ng's Dialektós piece — the framing this section is built on.
const DIALEKTOS_URL =
  "https://mascavoice.kit.com/posts/dialektos-ep1-beyond-the-bubble-with-john-ng-masca-national-chairperson-25-26"

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // Bubbles pop in around the hub as the section scrolls into view.
    gsap.from(".bubble", {
      scale: 0,
      autoAlpha: 0,
      transformOrigin: "center center",
      duration: 0.5,
      stagger: 0.08,
      ease: "entranceEase",
      scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
    })

    // Bridges + the outer "bigger bubble" draw themselves in — the signature motion.
    gsap.effects.writeInOnScroll(".bridge", {
      trigger: sectionRef.current,
      stagger: 0.07,
    })

    const mm = gsap.matchMedia()

    // The outer bubbles drift on their own clocks — a living network.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>(".bubble-float").forEach((node) => {
        gsap.to(node, {
          y: gsap.utils.random(-10, 10, 1),
          x: gsap.utils.random(-6, 6, 1),
          duration: gsap.utils.random(2.4, 3.8),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        })
      })
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef}>
      <div className="container section-pad grid grid-cols-1 lg:grid-cols-2 items-center gap-16">

        {/* Right (desktop): the message — flipped from the usual text-left
            rhythm to break the page's repetition. Stays first on mobile. */}
        <div className="flex flex-col gap-6 lg:order-2">
          <header className="flex flex-col gap-3">
            <span className="eyebrow text-red-600">Who we are</span>
            <h2 className="title text-blue-600">Beyond the bubble</h2>
          </header>

          <figure className="flex flex-col gap-2">
            <blockquote className="font-secondary text-lg italic leading-snug text-blue-600 md:text-xl">
              “Don&apos;t stay in your bubble — build a bigger one.”
            </blockquote>
            <figcaption className="text-caption text-gray-700">
              —{" "}
              <a
                href={DIALEKTOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 underline-offset-2 transition-colors hover:text-red-600 hover:underline"
              >
                John Ng
              </a>
              , National Chairperson &rsquo;25/26
            </figcaption>
          </figure>

          <p className="text-gray-700">
            MASCA isn&apos;t really a club — it&apos;s the bridges between them. We link
            campus bubbles across universities and states, so a country this big can
            still feel like home.
          </p>

          <p className="text-gray-700">
            We&apos;re the keeper of the campfire — the wood, the shelter, and the 
            continuity that keeps it burning, year after year. 
          </p>

          <Button variant="accent" href="/about" className="self-start mt-2">
            Our full story <span aria-hidden>&rarr;</span>
          </Button>
        </div>

        {/* Left (desktop): the network */}
        <div className="flex justify-center lg:order-1 lg:justify-start">
          <BubbleNetwork />
        </div>

      </div>
    </section>
  )
}

// Hub-and-spoke network: a central MASCA bubble wired to chapter bubbles, the
// whole thing wrapped in one larger "bigger bubble". Bridges are stroked paths
// so they can draw themselves in; bubbles sit on top to hide the joins.
function BubbleNetwork() {
  const C = { x: 210, y: 190 }
  // Eight chapters evenly spaced around the hub (every 45°, radius 125).
  const peripherals = [
    { x: 210, y: 65, label: "VIC" },
    { x: 298, y: 102, label: "NSW" },
    { x: 335, y: 190, label: "QLD" },
    { x: 298, y: 278, label: "WA" },
    { x: 210, y: 315, label: "SA" },
    { x: 122, y: 278, label: "ACT" },
    { x: 85, y: 190, label: "TAS" },
    { x: 122, y: 102, label: "NZ" },
  ]
  // A few extra ties between chapters so it reads as a web, not just a wheel.
  const crossLinks: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7]]

  return (
    <svg
      viewBox="0 0 420 380"
      className="h-auto w-full max-w-md overflow-visible"
      role="img"
      aria-label="MASCA at the centre of a network linking student chapters across Australia"
    >
      {/* Outer 'bigger bubble' */}
      <circle className="bridge" cx={C.x} cy={C.y} r="178" fill="none" stroke="#010066" strokeOpacity="0.15" strokeWidth="2" />

      {/* Spokes: hub → each chapter */}
      {peripherals.map((p, i) => (
        <path key={`spoke-${i}`} className="bridge" d={`M${C.x} ${C.y} L${p.x} ${p.y}`} stroke="#010066" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      ))}

      {/* Cross-links: chapter ↔ chapter */}
      {crossLinks.map(([a, b], i) => (
        <path key={`cross-${i}`} className="bridge" d={`M${peripherals[a].x} ${peripherals[a].y} L${peripherals[b].x} ${peripherals[b].y}`} stroke="#CC0001" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      ))}

      {/* Chapter bubbles */}
      {peripherals.map((p, i) => (
        <g key={`bubble-${i}`} className="bubble bubble-float">
          <circle cx={p.x} cy={p.y} r="30" fill="#010066" stroke="#FFCC00" strokeWidth="2" />
          <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="fill-white font-primary text-[13px] font-bold">
            {p.label}
          </text>
        </g>
      ))}

      {/* Central hub */}
      <g className="bubble">
        <circle cx={C.x} cy={C.y} r="48" fill="#FFCC00" />
        <text x={C.x} y={C.y} textAnchor="middle" dominantBaseline="central" className="fill-blue-900 font-primary text-[18px] font-black tracking-wide">
          MASCA
        </text>
      </g>
    </svg>
  )
}
