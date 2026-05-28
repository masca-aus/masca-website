'use client'

import { useRef } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

import type { Chapter, Event } from "@/utils/events"
import CheckoutButton from "./CheckoutButton"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const

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

  // has_available_tickets is the robust signal — false covers sold out, sales
  // ended, and sales not yet started; fall back to is_sold_out.
  const ta = event.ticket_availability
  const soldOut = ta ? ta.has_available_tickets === false || ta.is_sold_out === true : false

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
          <span className="absolute top-3 left-3 text-xs font-bold tracking-[0.2em] text-yellow-400">
            {(chapter?.name ?? "MASCA").toUpperCase()} CHAPTER
          </span>
          <span className="absolute top-2 right-3 rounded-full bg-yellow-400 px-4 py-2 text-xs font-bold text-blue-950">
            {date}
          </span>
        </div>
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
            <span className="text-sm font-bold tracking-wider text-red-600">Full</span>
          ) : (
            <CheckoutButton eventId={event.id} />
          )}
        </div>
      </div>
    </article>
  )
}
