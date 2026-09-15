import "server-only";

import config from "@payload-config";
import { getPayload, type Where } from "payload";

import type { Chapter, Event } from "@/utils/events";

import { EVENT_STATES, EVENT_TIME_ZONES, type EventSubmissionInput } from "./eventSubmission";

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
  state: true,
  ticketURL: true,
  poster: true,
} as const;

type PublicEventDoc = Pick<
  EventSubmissionInput,
  "title" | "organisation" | "description" | "startDate" | "venue" | "state"
> & {
  id: number | string;
  endDate?: string | null;
  ticketURL?: string | null;
  poster?: number | string | { url?: string | null } | null;
};

interface PublicEventPayload {
  find(options: {
    collection: "events";
    overrideAccess: false;
    draft: false;
    sort: "startDate";
    pagination: false;
    depth: 1;
    where: Where;
    select: typeof publicEventSelect;
    populate: { media: { url: true } };
  }): Promise<{ docs: PublicEventDoc[] }>;
}

function localDateTime(utc: string, state: EventSubmissionInput["state"]): string {
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
export async function getApprovedUpcomingEvents(now = new Date()): Promise<Event[]> {
  // Temporary, narrow Local API boundary until Task 6 regenerates the Events types.
  const payload = (await getPayload({ config })) as unknown as PublicEventPayload;
  const instant = now.toISOString();
  const { docs } = await payload.find({
    collection: "events",
    overrideAccess: false,
    draft: false,
    sort: "startDate",
    pagination: false,
    depth: 1,
    where: {
      reviewStatus: { equals: "approved" },
      _status: { equals: "published" },
      or: [
        { endDate: { greater_than_equal: instant } },
        {
          and: [
            { endDate: { exists: false } },
            { startDate: { greater_than_equal: instant } },
          ],
        },
      ],
    },
    select: publicEventSelect,
    populate: { media: { url: true } },
  });

  return docs.map((doc): Event => {
    const poster = typeof doc.poster === "object" ? doc.poster : null;
    const startLocal = localDateTime(doc.startDate, doc.state);

    return {
      id: String(doc.id),
      name: { text: doc.title },
      start: { local: startLocal, utc: doc.startDate },
      end: { local: doc.endDate ? localDateTime(doc.endDate, doc.state) : startLocal },
      // Preview fallback while the existing cards always offer a Register action.
      url: doc.ticketURL || "/contact",
      summary: doc.description,
      logo: poster?.url ? { url: poster.url } : null,
      venue: {
        name: doc.venue,
        address: { localized_address_display: doc.venue },
      },
      organizer: { id: doc.state, name: doc.organisation },
    };
  });
}
