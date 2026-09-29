const API = "https://www.eventbriteapi.com/v3"

export type Chapter = { id: string; name: string }

/**
 * Chapter filter shown on the events page. `id` MUST match an Eventbrite
 * organizer id (a sub-organizer under the MASCA organization); `name` is
 * the label used both for the filter pill and the card's chapter badge.
 * Add a new entry as each state chapter is set up in Eventbrite.
 */
export const CHAPTERS: Chapter[] = [
  { id: "121402646145", name: "National" },
  { id: "121402849559", name: "VIC" },
  { id: "121402851573", name: "NSW" },
]

export type Event = {
  isPast?: boolean;
  id: string;
  name: { text: string };
  start: { local: string; utc: string };
  end: { local: string };
  url: string;
  summary?: string;
  logo?: { url: string } | null;
  venue?: { name: string; details?: string; address: { localized_address_display: string } } | null;
  organizer?: { id: string; name: string } | null;
  ticket_availability?: {
    is_free?: boolean;
    is_sold_out?: boolean;
    minimum_ticket_price?: { major_value: string; currency: string; display: string };
  } | null;
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const token = process.env.EVENT_TOKEN
  const orgId = process.env.EVENT_ORG_ID
  if (!token || !orgId) {
    throw new Error("Missing token or id")
  }

  const params = new URLSearchParams({
    status: "live",
    time_filter: "current_future",
    order_by: "start_asc",
    // organizer → chapter signal; logo → card image; ticket_availability → price
    expand: "venue,logo,organizer,ticket_availability",
  })

  const res = await fetch(`${API}/organizations/${orgId}/events/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 }, // cache 1h (Cache Components is off in this project)
  })

  if (!res.ok) throw new Error(`Eventbrite ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return data.events ?? []
}

/**
 * Non-throwing variant for pages that should still render when Eventbrite
 * is down or unconfigured. Returns `null` (not `[]`) so callers can tell
 * "couldn't reach the calendar" apart from "nothing scheduled".
 */
export async function tryGetUpcomingEvents(): Promise<Event[] | null> {
  try {
    return await getUpcomingEvents()
  } catch (err) {
    console.error("[events] upcoming events unavailable:", err)
    return null
  }
}