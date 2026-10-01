import type { Event as PayloadEvent } from "@/payload-types";
import type { Event } from "@/utils/events";
import { EVENT_TIME_ZONES } from "./eventSubmission";

function localDateTime(utc: string, state: PayloadEvent["state"]): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIME_ZONES[state],
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utc));
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}T${date.hour}:${date.minute}`;
}

export function eventToPublicCard(doc: Pick<PayloadEvent, "id" | "title" | "organisation" | "description" | "startDate" | "endDate" | "state" | "venue" | "streetAddress" | "venueDetails" | "ticketURL" | "poster">, past = false): Event {
    const poster = typeof doc.poster === "object" ? doc.poster : null;
    const startLocal = localDateTime(doc.startDate, doc.state);

    return {
      id: String(doc.id),
      ...(past ? { isPast: true } : {}),
      name: { text: doc.title },
      start: { local: startLocal, utc: doc.startDate },
      end: { local: doc.endDate ? localDateTime(doc.endDate, doc.state) : startLocal },
      // Preview fallback while the existing cards always offer a Register action.
      url: doc.ticketURL || "/contact",
      summary: doc.description,
      logo: poster?.url ? { url: poster.url } : null,
      venue: {
        name: doc.venue,
        address: { localized_address_display: doc.streetAddress || doc.venue },
        ...(doc.venueDetails ? { details: doc.venueDetails } : {}),
      },
      organizer: { id: doc.state, name: doc.organisation },
    };
}
