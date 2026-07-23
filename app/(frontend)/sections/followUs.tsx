'use client'

import { useRef } from "react"
import Image from "next/image"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"

const INSTAGRAM_URL = "https://www.instagram.com/masca_national/"

// Nine brand cast illustrations stand in for a real post grid — authentic art,
// no fabricated screenshots. Each tile rotates through a brand tint.
const FEED_TILES = [
  { src: "/casts/Group 0.svg", tint: "bg-blue-100" },
  { src: "/casts/Group 3.svg", tint: "bg-red-100" },
  { src: "/casts/Group 6.svg", tint: "bg-yellow-100" },
  { src: "/casts/Group 9.svg", tint: "bg-red-100" },
  { src: "/casts/Jin.svg", tint: "bg-yellow-100" },
  { src: "/casts/Group 11.svg", tint: "bg-blue-100" },
  { src: "/casts/Group 2.svg", tint: "bg-yellow-100" },
  { src: "/casts/Pei.svg", tint: "bg-blue-100" },
  { src: "/casts/Group 5.svg", tint: "bg-red-100" },
]

export default function FollowUsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // Tiles pop into the "feed" as the section scrolls in — same entrance
    // language as the About network bubbles.
    gsap.from(".ig-tile", {
      scale: 0.6,
      autoAlpha: 0,
      transformOrigin: "center center",
      duration: 0.45,
      stagger: 0.06,
      ease: "back.out(1.7)",
      scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-blue-50">
      <div className="container section-pad grid grid-cols-1 items-center gap-16 lg:grid-cols-2">

        {/* Left: the pitch */}
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4">
            <span className="eyebrow text-red-600">@masca_national</span>
            <h2 className="title text-blue-600">See the community, every day</h2>
          </header>

          <p className="text-gray-700">
            Event recaps, reels, last-minute opportunities and the occasional sambal
            meme — Instagram is where MASCA actually lives between the big moments.
            Thousands of Malaysians across Australia already follow along.
          </p>

          <Button
            variant="secondary"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start mt-2"
          >
            <InstagramGlyph className="h-4 w-4" />
            Follow @masca_national
          </Button>
        </div>

        {/* Right: a faux Instagram profile card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-brand md:p-6">

            {/* Profile header */}
            <div className="flex items-center gap-4">
              {/* Gradient ring = the one unmistakable Instagram cue */}
              <span className="rounded-pill bg-gradient-to-tr from-yellow-500 via-red-600 to-blue-600 p-[3px]">
                <span className="flex rounded-pill bg-white p-[3px]">
                  <Image
                    src="/logo/logo.png"
                    alt="MASCA"
                    width={56}
                    height={56}
                    className="h-12 w-12 rounded-pill object-contain md:h-14 md:w-14"
                  />
                </span>
              </span>

              <div className="flex flex-1 flex-col gap-1">
                <span className="font-bold leading-none text-blue-600">masca_national</span>
                <span className="text-caption text-gray-700">Malaysian Students&apos; Council of Australia</span>
              </div>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow masca_national on Instagram"
                className="rounded-pill bg-blue-600 px-4 py-1.5 text-caption font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Follow
              </a>
            </div>

            {/* Feed grid */}
            <div className="mt-5 grid grid-cols-3 gap-1.5">
              {FEED_TILES.map((tile, i) => (
                <span
                  key={i}
                  className={`ig-tile group relative flex aspect-square items-end justify-center overflow-hidden rounded-sm ${tile.tint}`}
                >
                  <Image
                    src={tile.src}
                    alt=""
                    aria-hidden
                    width={120}
                    height={120}
                    className="h-[88%] w-[88%] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* A single heart cue on hover keeps it feeling like a live feed */}
                  {i === 4 && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-900/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <HeartGlyph className="h-7 w-7 text-white" />
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// Inline glyphs (matching the codebase's inline-SVG habit) so we don't lean on
// the project's unusual lucide-react pin.
function InstagramGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HeartGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 21s-7.5-4.6-10-9.3C.6 8.9 2 5.5 5.2 5.5c1.9 0 3.2 1.1 3.8 2.3.6 1.2 2.4 1.2 3 0 .6-1.2 1.9-2.3 3.8-2.3 3.2 0 4.6 3.4 3.2 6.2C19.5 16.4 12 21 12 21z" />
    </svg>
  )
}
