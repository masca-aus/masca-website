'use client'

import { useRef } from "react"

import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"

// Equalizer bars for the "broadcast" card — the visual heart of silence → roar.
const BARS = Array.from({ length: 32 })

export default function MascaVoiceSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    // Hand-drawn soundwave draws itself in — the site's signature scroll motion.
    gsap.effects.writeInOnScroll(".voice-line", { trigger: sectionRef.current })

    const bars = gsap.utils.toArray<HTMLElement>(".voice-bar")
    // Start flat — silence.
    gsap.set(bars, { transformOrigin: "center bottom", scaleY: 0.05 })

    const mm = gsap.matchMedia()

    // …then roar: each bar oscillates on its own clock once in view.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      bars.forEach((bar) => {
        gsap.timeline({
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        }).fromTo(
          bar,
          { scaleY: () => gsap.utils.random(0.2, 0.5, 0.01) },
          {
            scaleY: () => gsap.utils.random(0.6, 1, 0.01),
            duration: gsap.utils.random(0.45, 0.95),
            ease: "sine.inOut",
            immediateRender: false,
          },
        )
      })
    })

    // Reduced motion: skip the loop, just settle the bars at varied heights.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      bars.forEach((bar) => {
        gsap.to(bar, {
          scaleY: gsap.utils.random(0.3, 1, 0.01),
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        })
      })
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-blue-900">
      <div className="container grid grid-cols-1 lg:grid-cols-2 items-center gap-16 py-32">

        {/* Left: the message */}
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <span className="eyebrow text-yellow-500">MASCAvoice</span>
            <span className="title text-white inline-flex flex-col">
              From silence to roar
              <Soundwave />
            </span>
          </header>

          <p className="font-secondary text-xl italic leading-snug text-yellow-500">
            The Editorial addresses. The Agora responds. The Dialektós amplifies.
          </p>

          <p className="text-gray-300">
            After three years of quiet, MASCA&apos;s publishing voice is back.
            MASCAvoice is where Malaysian students in Australia write about identity,
            culture, and the world as we see it — because silence is dangerous. It
            erases who we are.
          </p>

          <div className="grid grid-cols-1 gap-6 border-t border-white/15 pt-8 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow text-yellow-500">Editorials</span>
              <p className="text-body-sm text-gray-300">
                Identity, culture, and Malaysian perspectives on a global stage.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow text-yellow-500">Agora</span>
              <p className="text-body-sm text-gray-300">
                An open floor for your essays, reflections, and poetry.
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            href="https://mascavoice.kit.com/posts"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start mt-2"
          >
            Read MASCAvoice <span aria-hidden>&rarr;</span>
          </Button>
        </div>

        {/* Right: the broadcast */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative isolate flex w-full max-w-xl flex-col gap-8 rounded-xl bg-blue-600 p-8 shadow-brand md:p-10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-red-600 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-pill bg-red-600" />
              </span>
              <span className="eyebrow text-white/70">now broadcasting</span>
            </div>

            <div className="flex h-36 items-end justify-between gap-1" aria-hidden>
              {BARS.map((_, i) => (
                <span key={i} className="voice-bar h-full flex-1 rounded-pill bg-yellow-500" />
              ))}
            </div>

            <blockquote className="font-secondary text-2xl italic leading-snug text-white md:text-3xl">
              “Silence is dangerous. It erases who we are.”
            </blockquote>
            <span className="text-caption -mt-4 text-white/60">— MASCAvoice, from silence to roar</span>
          </div>
        </div>

      </div>
    </section>
  )
}

// Hand-traced soundwave underline; drawn in on scroll like the site's other doodles.
function Soundwave() {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-2 h-4 w-48 text-yellow-500"
    >
      <path
        className="voice-line"
        d="M2 12 Q 17 2 32 12 T 62 12 T 92 12 T 122 12 T 152 12 T 182 12 T 212 12 T 238 12"
      />
    </svg>
  )
}