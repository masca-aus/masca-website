'use client'

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import type { CommitteeMember } from "@/utils/committee"


export default function YearbookStack({ members }: { members: CommitteeMember[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const hoverTl = useRef<gsap.core.Timeline | null>(null)

  const n = members.length
  const mid = (n - 1) / 2
  const centerIndex = Math.round(mid)

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".polaroid")

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
          zIndex: Math.round(n - Math.abs(i - mid)),
        })
      })

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

    window.addEventListener("resize", layout)
    return () => window.removeEventListener("resize", layout)
  }, { scope: rootRef })

  return (
    <div ref={rootRef} className="relative flex justify-center lg:justify-end">
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
              <span className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 -rotate-3 rounded-xs bg-yellow-500/80" aria-hidden />
            )}

            <div className="relative aspect-3/4 overflow-hidden rounded-xs bg-blue-50">
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
