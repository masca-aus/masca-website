'use client'

import { useRef } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

// Our Story: the official copy verbatim (this is the page stakeholders cite),
// framed warmly, beside a hand-drawn KL → Australia journey that literally
// illustrates "Down Under".
export default function StorySection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // The flight path writes itself in — the site's signature stroke motion.
    gsap.effects.writeInOnScroll(".journey-path", {
      trigger: sectionRef.current,
      duration: 1.4,
      ease: "power1.inOut",
    })

    // Hubs and fact stops pop in along the way, same idiom as the home page's
    // bubble network.
    gsap.from(".journey-node", {
      scale: 0,
      autoAlpha: 0,
      transformOrigin: "center center",
      duration: 0.5,
      stagger: 0.14,
      ease: "entranceEase",
      scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef}>
      <div className="container section-pad grid grid-cols-1 items-center gap-16 lg:grid-cols-2">

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <span className="eyebrow text-red-600">Our story</span>
            <h2 className="title text-blue-600">
              Twenty-five years of making a big country feel smaller
            </h2>
          </header>

          <p className="font-secondary italic text-blue-600">
            From one council in 2001 to a family across seven states and
            territories.
          </p>

          <p className="text-gray-700">
            Established in 2001, the Malaysian Students&rsquo; Council of
            Australia (MASCA), or Majlis Perwakilan Pelajar Malaysia di
            Australia, is an independent, non-profit and non-partisan
            organisation that serves as the peak representative body of
            Malaysian students in Australia, officially recognised by Education
            Malaysia Australia (EMA).
          </p>

          <p className="text-gray-700">
            Through our network of affiliated Malaysian Student Organisations
            (MSOs) spanning 7 states and territories, we support students in
            their professional development, advocate for their welfare, and
            unite the community to celebrate the Spirit of Malaysia Down Under.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <JourneyDoodle />
        </div>

      </div>
    </section>
  )
}

// Hand-drawn journey: a stroked path swoops from a Malaysia hub down to an
// Australia hub, passing three fact stops. The path draws in (drawSVG) while
// the nodes pop in on top — nodes sit after the path in the DOM so they paint
// over the joins, same trick as the home page's BubbleNetwork.
function JourneyDoodle() {
  return (
    <svg
      viewBox="0 0 420 480"
      className="h-auto w-full max-w-md overflow-visible"
      role="img"
      aria-label="MASCA's journey from Malaysia to Australia: established 2001, recognised by Education Malaysia Australia, with MSOs across 7 states and territories"
    >
      {/* Flight path: KL down to Down Under, via the three fact stops */}
      <path
        className="journey-path"
        d="M100 87 C 150 130, 235 95, 255 140 C 278 192, 165 200, 145 250 C 122 305, 245 300, 272 350 C 288 378, 293 390, 297 403"
        fill="none"
        stroke="#010066"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Malaysia hub */}
      <g className="journey-node">
        <circle cx="95" cy="55" r="32" fill="#010066" stroke="#FFCC00" strokeWidth="2" />
        <text x="95" y="55" textAnchor="middle" dominantBaseline="central" className="fill-white font-primary text-[15px] font-bold">
          MY
        </text>
        <text x="138" y="60" className="fill-gray-700 font-primary text-[13px] font-semibold">
          Kuala Lumpur
        </text>
      </g>

      {/* Fact stops along the way */}
      <g className="journey-node">
        <circle cx="255" cy="140" r="7" fill="#CC0001" stroke="#FFFFFF" strokeWidth="2" />
        <text x="272" y="144" className="fill-blue-600 font-primary text-[13px] font-bold">
          est. 2001
        </text>
      </g>

      <g className="journey-node">
        <circle cx="145" cy="250" r="7" fill="#CC0001" stroke="#FFFFFF" strokeWidth="2" />
        <text x="126" y="254" textAnchor="end" className="fill-blue-600 font-primary text-[13px] font-bold">
          recognised by EMA
        </text>
      </g>

      <g className="journey-node">
        <circle cx="272" cy="350" r="7" fill="#CC0001" stroke="#FFFFFF" strokeWidth="2" />
        <text x="253" y="344" textAnchor="end" className="fill-blue-600 font-primary text-[13px] font-bold">
          <tspan x="253" dy="0">MSOs across 7</tspan>
          <tspan x="253" dy="16">states &amp; territories</tspan>
        </text>
      </g>

      {/* Paper plane riding the last leg into Australia */}
      <g className="journey-node" transform="translate(240 375) rotate(50)">
        <path d="M0 2 L28 10 L2 20 L7 10 Z" fill="#CC0001" />
      </g>

      {/* Australia hub — Down Under, so it sits at the bottom */}
      <g className="journey-node">
        <circle cx="300" cy="418" r="40" fill="#FFCC00" />
        <text x="300" y="418" textAnchor="middle" dominantBaseline="central" className="fill-blue-900 font-primary text-[18px] font-black tracking-wide">
          AU
        </text>
        <text x="230" y="423" textAnchor="end" className="fill-gray-700 font-primary text-[13px] font-semibold">
          Down Under
        </text>
      </g>
    </svg>
  )
}
