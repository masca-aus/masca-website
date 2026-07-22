// Sponsor logos for the marquee.
//
// Source of truth is the Payload `sponsors` collection (edited at /admin),
// read here through Payload's Local API — a direct DB query on the server,
// no HTTP hop. Pages that call this stay statically rendered: the query runs
// at build/revalidate time, never per request. afterChange/afterDelete hooks
// on the collection call revalidatePath, so an edit in /admin shows on the
// live site in seconds without a redeploy.

import { getPayload } from "payload"

import config from "@payload-config"
import type { Sponsor as SponsorDoc } from "@/payload-types"

export type Sponsor = {
  id: string
  name: string
  date: string
  img: string
}

/**
 * Returns sponsors sorted by `date` (newest first).
 */
export async function getSponsors(): Promise<Sponsor[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: "sponsors",
    sort: "-date",
    // A handful of sponsors at most — fetch them all.
    pagination: false,
    // Populate the logo relation so its Supabase Storage URL comes along.
    depth: 1,
  })
  return docs.map(toSponsor)
}

/** Maps a Payload doc to the shape the marquee renders. */
export function toSponsor(doc: SponsorDoc): Sponsor {
  // At depth 1 the logo arrives populated; anything else (depth 0, a deleted
  // relation) degrades to an empty img rather than a crash.
  const logo = typeof doc.logo === "object" ? doc.logo : null

  return {
    id: String(doc.id),
    name: doc.name,
    date: doc.date,
    img: logo?.url ?? "",
  }
}
