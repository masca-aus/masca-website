'use client'

import { useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import Button from "@/components/Button"
import type { Chapter, Event } from "@/utils/events"
import { STATES } from "@/utils/states"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const

// Chapter pill colours, keyed by state code. National / unknown chapters fall
// back to the MASCA brand blue + yellow.
const STATE_BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]))
const BRAND_PILL = { bg: "#010066", fg: "#FFCC00" }

/** Parse Eventbrite's "local" ISO ("2026-06-12T18:00:00") into ymd/hour. */
function parseLocal(local: string) {
  const [date, time] = local.split("T")
  const [y, m, d] = date.split("-").map(Number)
  const [h] = time.split(":").map(Number)
  return { y, m, d, h }
}

function dateBadge(local: string) {
  const { m, d } = parseLocal(local)
  return `${d} ${MONTHS[m - 1]}`
}

function hourLabel(local: string) {
  const { h } = parseLocal(local)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${h >= 12 ? "pm" : "am"}`
}

function priceLabel(event: Event) {
  const ta = event.ticket_availability
  if (!ta) return "TBA"
  const min = ta.minimum_ticket_price
  // `is_free` is unset for many free events; a $0 minimum ticket price is the
  // reliable signal, so treat both as free entry.
  const value = min ? parseFloat(min.major_value) : 0
  if (ta.is_free || !min || value === 0) return "Free entry"
  return `$${value.toFixed(0)}`
}

export default function EventCard({ event, chapter }: { event: Event; chapter?: Chapter }) {
  const cardRef = useRef<HTMLElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useGSAP(() => {
    tweenRef.current = gsap.to(cardRef.current, {
      y: -8,
      ease: "none",
      boxShadow: "var(--shadow-xl)",
      paused: true,
    })
  }, { scope: cardRef })

  const date = dateBadge(event.start.local)
  const time = `${hourLabel(event.start.local)} – ${hourLabel(event.end.local)}`
  const location = event.venue?.name ?? "Online"
  const price = priceLabel(event)
  const soldOut = event.ticket_availability?.is_sold_out === true

  const chapterCode = (chapter?.name ?? "MASCA").toUpperCase()
  const chapterPill = STATE_BY_CODE[chapterCode] ?? BRAND_PILL

  return (
    <article
      ref={cardRef}
      className="event-card flex flex-col w-full max-w-md rounded-2xl shadow-lg overflow-hidden bg-white"
      onMouseEnter={() => tweenRef.current?.play()}
      onMouseLeave={() => tweenRef.current?.reverse()}
    >
      {/* Top banner — Eventbrite logo if present, else blue gradient */}
      <div className="relative min-h-44 bg-linear-to-br from-blue-900 to-blue-950">
        {event.logo?.url && (
          // Plain <img>: Eventbrite hosts logos on evbuc.com; using <img>
          // avoids configuring next.config images.remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.logo.url}
            alt={event.name.text}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="flex items-center justify-center">
          <span
            className="absolute top-4 left-4 rounded-full px-4 py-2 text-xs font-bold tracking-wide"
            style={{ backgroundColor: chapterPill.bg, color: chapterPill.fg }}
            aria-label={`${chapterCode} chapter`}
          >
            {chapterCode}
          </span>
          <span className="absolute top-4 right-4 rounded-full bg-yellow-400 px-4 py-2 text-xs font-bold text-blue-950">
            {date}
          </span>
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-950/60">
            <span className="rounded-pill bg-red-600 px-5 py-2 text-sm font-bold tracking-[0.2em] text-white">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-h4 font-bold text-blue-600">{event.name.text}</h3>
          <span className="text-sm text-gray-500">
            {location} · {time}
          </span>
        </div>

        <div className="border-b border-gray-200" />

        <div className="flex items-center justify-between">
          <span className="text-md font-bold text-red-700">{price}</span>
          {soldOut ? (
            <span className="text-sm font-bold tracking-wider text-gray-400">Sold out</span>
          ) : (
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost">
                Register <span aria-hidden>&rarr;</span>
              </Button>
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
