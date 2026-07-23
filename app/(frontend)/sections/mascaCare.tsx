'use client'

import { useRef } from "react";
import gsap from "gsap"
import { useGSAP } from "@gsap/react";
import Link from "next/link"

import { Kita }  from "@/components/TextSVG";
import Button from "@/components/Button";

export default function MascaCareSection() {
  return (
    <section >
      <div className="container section-pad grid grid-cols-1 lg:grid-cols-2 items-center gap-24 lg:gap-16">
        <div className="flex flex-col gap-6 lg:order-2">

          <header className="flex flex-col gap-4">
            <span className="eyebrow text-red-600">student welfare</span>
            <h2 className="title text-blue-600">If something&apos;s not right, we&apos;re here</h2>
          </header>
          
          <p className="font-secondary text-blue-600 italic">“Reach out — no judgement, no paperwork, no problem too small.”</p>
          <p className="text-gray-700">Whether it&apos;s visa worries, mental health, accommodation, or just needing a sambal fix on a hard week — your chapter has trained student leaders ready to listen and connect you to help.</p>
          <Button href="/contact" className="self-start mt-4">Get Support <span>&rarr;</span></Button>
        </div>

        <div className="flex justify-center lg:order-1 lg:justify-start">
          <div className="relative">
            {/* Hand-drawn nudge: cursive note + looping arrow curling into the card */}
            <div className="pointer-events-none absolute -top-14 left-4 z-10 flex items-start gap-1 -rotate-6 md:-top-16 md:left-8">
              <span className="font-accent text-2xl leading-none text-red-600 md:text-3xl">
                click to learn more
              </span>
              <LoopArrow className="w-11 shrink-0 text-red-600 md:w-12" />
            </div>
            <MascaCareCard />
          </div>
        </div>
      </div>
    </section>
  )
}

function MascaCareCard() {
  const cardRef = useRef(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useGSAP(() => {
    gsap.effects.writeInOnScroll(".kita", { trigger: cardRef.current });
    tweenRef.current = gsap.to(cardRef.current, {
      y: -16,
      ease: "none",
      paused: true,
      duration: 0.2,
    })
  }, { scope: cardRef })

  return (
    <Link
      ref={cardRef}
      href="/care"
      onMouseEnter={() => tweenRef.current?.play()}
      onMouseLeave={() => tweenRef.current?.reverse()}
      onFocus={() => tweenRef.current?.play()}
      onBlur={() => tweenRef.current?.reverse()}
      className="relative isolate overflow-hidden flex flex-col justify-center w-full max-w-xl min-h-105 md:min-h-130 rounded-xl bg-blue-600 shadow-brand p-6 md:p-8 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-500"
    >
      <span className="eyebrow text-yellow-500">masca care</span>
      {/* Display number, not a document heading — the section's h2 sits above. */}
      <p className="text-yellow-500 leading-none mt-2 text-7xl md:text-8xl font-black">1800 <br/> MASCA</p>
      <span className="text-caption text-white mt-3">Confidential. Free. Staffed by trained MASCA student leaders.</span>

      <div className="border-t border-blue-100/20 my-6"></div>

      <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4">
          <span className="eyebrow text-gray-300/50">email</span>
          <span className="eyebrow text-white">cares@masca.org.au</span>
          <span className="eyebrow text-gray-300/50">walk-in</span>
          <span className="eyebrow text-white">Your nearest chapter office</span>
          <span className="eyebrow text-gray-300/50">Emergency</span>
          <span className="eyebrow text-white">000 first, then us</span>
      </div>

      <span className="pointer-events-none absolute bottom-1 -right-6 w-48 md:w-64 opacity-40 -z-10">
        <Kita />
      </span>
    </Link>
  )
}

// Doodle-style looping arrow that curls and points down-right (into the card).
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
      {/* swoop + single loop, ending lower-right */}
      <path d="M6 24 C 34 2 76 4 80 38 C 82 56 58 60 56 42 C 55 30 74 31 80 45 C 92 72 96 84 108 94" />
      {/* arrowhead, tip at the path end */}
      <path d="M90 92 L108 94 L102 74" />
    </svg>
  );
}