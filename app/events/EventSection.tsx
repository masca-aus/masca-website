'use client'

import { useMemo, useState, useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import type { Chapter, Event } from "@/utils/events"
import EventCard from "./EventCard"

export default function EventList({ events, chapters }: { events: Event[]; chapters: Chapter[] }) {
  const [selected, setSelected] = useState<string>("all")

  // O(1) lookup of chapter metadata from an event's organizer id
  const chapterById = useMemo(
    () => Object.fromEntries(chapters.map((c) => [c.id, c])),
    [chapters],
  )

  const filtered = useMemo(
    () => (selected === "all" ? events : events.filter((e) => e.organizer?.id === selected)),
    [events, selected],
  )

  // Synthetic "All" pill prepended to the real chapters
  const pills: Chapter[] = [{ id: "all", name: "All" }, ...chapters]

  const gridRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from(".event-card", {
      opacity: 0,
      y: 32,
      scale: 0.96,
      duration: 0.55,
      stagger: 0.06,
      ease: "entranceEase",
      scrollTrigger: {
        trigger: gridRef.current,
        start: "top 85%",
      },
    })
  }, { scope: gridRef })

  return (
    <div className="flex flex-col gap-8 container py-16">
      {/* Chapter filter — same pattern as the topic chips in ContactForm */}
      <fieldset className="flex flex-col">
        <div className="flex flex-wrap gap-4 mt-2">
          {pills.map((c) => {
            const active = selected === c.id
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(c.id)}
                className={`rounded-pill border-2 px-5 py-2 text-body-sm font-bold transition-colors ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-blue-100 text-blue-600 hover:border-blue-600"
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">No upcoming events for this chapter.</p>
      ) : (
        <div 
          ref={gridRef}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center items-center"
        >
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              chapter={event.organizer ? chapterById[event.organizer.id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}