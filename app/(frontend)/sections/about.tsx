'use client'

import { useRef } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"
import { STATES } from "@/utils/states"

// John Ng's Dialektós piece — the framing this section is built on.
const DIALEKTOS_URL =
  "https://mascavoice.kit.com/posts/dialektos-ep1-beyond-the-bubble-with-john-ng-masca-national-chairperson-25-26"

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    // Every animation here is entrance/ambient flourish, so reduced-motion
    // users simply get the finished picture: nothing below runs for them, and
    // the SVG renders fully drawn on its own.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(".bubble", {
        scale: 0,
        autoAlpha: 0,
        transformOrigin: "center center",
      })
      gsap.set(".bridge", { drawSVG: "0%" })

      // One timeline so the quote's story lands in order: the bubbles
      // exist first, then the bridges link them.
      gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
      })
        .to(".bubble", {
          scale: 1,
          autoAlpha: 1,
          duration: 0.5,
          stagger: { each: 0.06, from: "random" },
          ease: "entranceEase",
        })
        .to(".bridge", {
          drawSVG: "100%",
          duration: 0.4,
          stagger: 0.06,
          ease: "power1.out",
        }, "-=0.35")

      // The bubbles drift on their own clocks — a living network.
      gsap.utils.toArray<HTMLElement>(".bubble-float").forEach((node) => {
        gsap.to(node, {
          y: gsap.utils.random(-9, 9, 1),
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

          <figure className="flex flex-col gap-2 border-l-4 border-yellow-500 pl-5">
            <blockquote className="font-secondary text-xl italic leading-snug text-blue-600 md:text-2xl">
              “Don&apos;t stay in your bubble —{" "}
              <span className="underline decoration-yellow-500 decoration-[3px] underline-offset-4">
                build a bigger one
              </span>
              .”
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

// The quote, drawn: chapter bubbles in their own colours tied peer-to-peer.
// Deliberately no hub node — the copy says MASCA is the bridges between
// clubs, not another club at the centre, so the middle stays empty. Bridges
// are stroked paths so they can draw themselves in; bubbles render on top to
// hide the joins.
function BubbleNetwork() {
  // Organic cluster — varied sizes and off-grid positions so it reads as a
  // living community, not a diagram. Indexed against STATES (VIC NSW QLD WA
  // SA ACT TAS NZ) so chapter colours stay single-sourced.
  const spots = [
    { x: 150, y: 130, r: 34 }, // VIC
    { x: 290, y: 120, r: 32 }, // NSW
    { x: 338, y: 225, r: 28 }, // QLD
    { x: 148, y: 302, r: 30 }, // WA
    { x: 242, y: 332, r: 26 }, // SA
    { x: 103, y: 218, r: 24 }, // ACT
    { x: 312, y: 308, r: 25 }, // TAS
    { x: 218, y: 72,  r: 24 }, // NZ
  ]
  const chapters = STATES.map((state, i) => ({ ...state, ...spots[i] }))

  // Neighbour ties around the cluster, plus long ties arcing through the
  // middle — right where a hub would sit if MASCA were one.
  const links: [number, number][] = [[7, 1], [1, 2], [2, 6], [6, 4], [4, 3], [3, 5], [5, 0], [0, 7]]
  const crossLinks: [number, number][] = [[0, 6], [5, 2]]

  // Unlabelled specks: the students behind the chapters.
  const dots = [
    { x: 196, y: 180, r: 4, fill: "#34389A", opacity: 0.35 },
    { x: 262, y: 168, r: 3, fill: "#CC0001", opacity: 0.3 },
    { x: 238, y: 268, r: 5, fill: "#FFCC00", opacity: 0.6 },
    { x: 172, y: 262, r: 3, fill: "#010066", opacity: 0.25 },
  ]

  // Gentle quadratic arc between two bubbles; bow > 0 bends left of travel.
  const arc = (a: { x: number; y: number }, b: { x: number; y: number }, bow: number) => {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    return `M${a.x} ${a.y} Q${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`
  }

  return (
    <svg
      viewBox="70 36 305 334"
      className="h-auto w-full max-w-md overflow-visible"
      role="img"
      aria-label="MASCA chapter bubbles across Australia and New Zealand, joined together by bridges"
    >
      {/* Bridges: chapter ↔ chapter, no hub */}
      {links.map(([a, b], i) => (
        <path
          key={`link-${i}`}
          className="bridge"
          d={arc(chapters[a], chapters[b], i % 2 ? 16 : -16)}
          fill="none" stroke="#010066" strokeOpacity="0.3" strokeWidth="1.75" strokeLinecap="round"
        />
      ))}
      {crossLinks.map(([a, b], i) => (
        <path
          key={`cross-${i}`}
          className="bridge"
          d={arc(chapters[a], chapters[b], i % 2 ? -26 : 26)}
          fill="none" stroke="#CC0001" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round"
        />
      ))}

      {/* Student specks */}
      {dots.map((d, i) => (
        <circle
          key={`dot-${i}`}
          className="bubble bubble-float"
          cx={d.x} cy={d.y} r={d.r} fill={d.fill} opacity={d.opacity}
        />
      ))}

      {/* Chapter bubbles, each in its own chapter colour */}
      {chapters.map((c) => (
        <g key={c.code} className="bubble bubble-float">
          <circle cx={c.x} cy={c.y} r={c.r} fill={c.bg} />
          {/* Soap-bubble glint */}
          <circle
            cx={c.x - c.r * 0.35} cy={c.y - c.r * 0.35} r={c.r * 0.18}
            fill="#FFFFFF" opacity="0.35"
          />
          <text
            x={c.x} y={c.y}
            textAnchor="middle" dominantBaseline="central"
            fill={c.fg} fontSize={Math.max(10, Math.round(c.r * 0.42))}
            className="font-primary font-bold"
          >
            {c.code}
          </text>
        </g>
      ))}

    </svg>
  )
}
