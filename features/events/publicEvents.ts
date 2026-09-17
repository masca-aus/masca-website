import "server-only";

import config from "@payload-config";
import { getPayload } from "payload";

import type { Event as PayloadEvent } from "@/payload-types";
import type { Chapter, Event } from "@/utils/events";

import { lifecycleIDs } from "./eventLifecycle";
import { EVENT_STATES, EVENT_TIME_ZONES } from "./eventSubmission";

export const CMS_EVENT_CHAPTERS: Chapter[] = EVENT_STATES.map(({ value }) => ({
  id: value,
  name: value,
}));

const publicEventSelect = {
  title: true,
  organisation: true,
  description: true,
  startDate: true,
  endDate: true,
  venue: true,
  streetAddress: true,
  venueDetails: true,
  state: true,
  ticketURL: true,
  poster: true,
} as const;

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

/** Reads the public calendar and maps only the fields the existing cards render. */
export async function getApprovedUpcomingEvents(now = new Date()): Promise<Event[]> { return getPublicEvents(now, false); }
export async function getApprovedPastEvents(now = new Date()): Promise<Event[]> { return getPublicEvents(now, true); }
async function getPublicEvents(now: Date, past: boolean): Promise<Event[]> {
  const payload = await getPayload({ config });
  const instant = now.toISOString();
  const completed = await lifecycleIDs(payload, "completed");
  const { docs } = await payload.find({
    collection: "events",
    overrideAccess: false,
    draft: false,
    sort: past ? "-startDate" : "startDate",
    pagination: false,
    depth: 1,
    where: {
      reviewStatus: { equals: "approved" },
      _status: { equals: "published" },
      ...(past ? { or: [
        { id: { in: completed.length ? completed : [-1] } },
        { endDate: { less_than: instant } },
        { and: [{ endDate: { exists: false } }, { startDate: { less_than: instant } }] },
      ] } : { id: { not_in: completed.length ? completed : [-1] }, or: [
        { endDate: { greater_than_equal: instant } },
        {
          and: [
            { endDate: { exists: false } },
            { startDate: { greater_than_equal: instant } },
          ],
        },
      ] }),
    },
    select: publicEventSelect,
    // The storage plugin builds `url` from `filename` during afterRead.
    populate: { media: { filename: true, url: true } },
  });

  return docs.map((doc): Event => {
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
  });
}
