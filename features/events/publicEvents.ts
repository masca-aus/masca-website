import "server-only";

import config from "@payload-config";
import { getPayload } from "payload";

import type { Chapter, Event } from "@/utils/events";

import { eventToPublicCard } from "./eventCardModel";

import { EVENT_STATES } from "./eventSubmission";

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

/** Reads the public calendar and maps only the fields the existing cards render. */
export async function getApprovedUpcomingEvents(now = new Date()): Promise<Event[]> { return getPublicEvents(now, false); }
export async function getApprovedPastEvents(now = new Date()): Promise<Event[]> { return getPublicEvents(now, true); }
async function getPublicEvents(now: Date, past: boolean): Promise<Event[]> {
  const payload = await getPayload({ config });
  const instant = now.toISOString();
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
        { endDate: { less_than: instant } },
        { and: [{ endDate: { exists: false } }, { startDate: { less_than: instant } }] },
      ] } : { or: [
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

  return docs.map(doc => eventToPublicCard(doc, past));
}
