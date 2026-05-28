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
  id: string;
  name: { text: string };
  start: { local: string; utc: string };
  end: { local: string };
  url: string;
  summary?: string;
  logo?: { url: string } | null;
  venue?: { name: string; address: { localized_address_display: string } } | null;
  organizer?: { id: string; name: string } | null;
  ticket_availability?: {
    is_free?: boolean;
    is_sold_out?: boolean;
    has_available_tickets?: boolean;
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
    next: { revalidate: 3600 }, // cache 1h (Cache Components is off in this project)
  })

  if (!res.ok) throw new Error(`Eventbrite ${res.status}: ${await res.text()}`)

  const data = await res.json()
  return data.events ?? []
}

/**
 * Looks up a single upcoming event by id. Reuses the cached organization
 * fetch, so it costs no extra API call. Returns undefined for ids that aren't
 * in the current/future live set (e.g. past or unpublished events).
 */
export async function getEventById(id: string): Promise<Event | undefined> {
  const events = await getUpcomingEvents()
  return events.find((e) => e.id === id)
}