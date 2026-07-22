import Button from "@/components/Button"
import { getUpcomingEvents } from "@/utils/events"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

/** Parse Eventbrite's "local" ISO ("2026-07-03T09:00:00") into y/m/d. */
function ymd(local: string) {
  const [y, m, d] = local.split("T")[0].split("-").map(Number)
  return { y, m, d }
}

/** "3 July 2026" (single day) or "3–5 July 2026" (multi-day in one month). */
function dateRange(startLocal: string, endLocal: string) {
  const s = ymd(startLocal)
  const e = ymd(endLocal)
  if (s.y === e.y && s.m === e.m) {
    const days = s.d === e.d ? `${s.d}` : `${s.d}–${e.d}`
    return `${days} ${MONTHS[s.m - 1]} ${s.y}`
  }
  return `${s.d} ${MONTHS[s.m - 1]} – ${e.d} ${MONTHS[e.m - 1]} ${e.y}`
}

export default async function UpcomingEvent() {
  // Ordered start_asc in getUpcomingEvents, so the first is the next one up.
  const [event] = await getUpcomingEvents()
  if (!event) return null

  const location = event.venue?.name ?? "Online"
  const when = dateRange(event.start.local, event.end.local)
  const host = event.organizer?.name ?? "MASCA"
  const soldOut = event.ticket_availability?.is_sold_out === true

  return (
    <div className="flex flex-col items-start border border-blue-100/20 rounded-lg bg-blue-500 mx-8 w-72 sm:w-80 overflow-hidden">
      {/* Event banner — Eventbrite hosts logos on evbuc.com, so a plain <img>
          avoids configuring next.config images.remotePatterns. */}
      {event.logo?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.logo.url}
          alt={event.name.text}
          className="h-32 w-full object-cover"
        />
      )}

      <div className="flex flex-col gap-3 items-start p-6">
        <span className="eyebrow text-yellow-500 text-xs uppercase tracking-wider">Next Major Event</span>
        <span className="text-white text-xl font-bold leading-tight -mt-1">{event.name.text}</span>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-caption text-gray-300">
            {location} &middot; {when}
          </span>
          <span className="text-caption text-gray-300">Hosted by {host}</span>
        </div>
        <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-1">
          <Button variant="secondary" className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
            {soldOut ? "Sold out" : "Register now"}
          </Button>
        </a>
      </div>
    </div>
  )
}