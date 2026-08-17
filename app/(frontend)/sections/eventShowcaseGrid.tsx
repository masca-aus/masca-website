'use client'

import { useMemo, useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import EventCard from "@/app/(frontend)/events/EventCard"
import type { Chapter, Event } from "@/utils/events"

export default function EventShowcaseGrid({
  events,
  chapters,
}: {
  events: Event[]
  chapters: Chapter[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const chapterById = useMemo(
    () => Object.fromEntries(chapters.map((c) => [c.id, c])),
    [chapters],
  )

  useGSAP(
    () => {
      if (events.length === 0) return
      gsap.from(".event-card", {
        opacity: 0,
        y: 24,
        duration: 0.2,
        stagger: 0.08,
        ease: "entranceEase",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      })
    },
    { scope: containerRef },
  )

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center items-center"
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          chapter={event.organizer ? chapterById[event.organizer.id] : undefined}
        />
      ))}
    </div>
  )
}