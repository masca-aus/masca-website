// Committee member directory.
//
// Source of truth is the Payload `committee` collection (edited at /admin),
// read here through Payload's Local API — a direct DB query on the server,
// no HTTP hop. Pages that call this stay statically rendered: the query runs
// at build/revalidate time, never per request. afterChange/afterDelete hooks
// on the collection call revalidatePath, so an edit in /admin shows on the
// live site in seconds without a redeploy.

import { getPayload } from "payload"

import config from "@payload-config"
import type { Committee } from "@/payload-types"
export type CommitteeDepartment =
  | "chairs"
  | "secretariat"
  | "treasury"
  | "amplifies"
  | "careers"
  | "cares"
  | "unites"
  | "unassigned"

export type CommitteeMember = {
  id: string
  name: string
  role: string
  department: CommitteeDepartment
  img: string
  year: string
  university?: string
  course?: string
  linkedin_url?: string
  bio?: string
}

/**
 * Returns committee members in admin drag order (`_order` ascending),
 * optionally filtered to a single `year`.
 */
export async function getCommittee(year?: string): Promise<CommitteeMember[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: "committee",
    ...(year !== undefined ? { where: { year: { equals: year } } } : {}),
    sort: "_order",
    // The committee is a couple dozen people a year — fetch them all.
    pagination: false,
    // Populate the portrait relation so its Supabase Storage URL comes along.
    depth: 1,
  })
  return docs.map(toCommitteeMember)
}

/** Unique years present in the data, newest first — drives the tab nav. */
export function getCommitteeYears(members: CommitteeMember[]): string[] {
  return [...new Set(members.map((m) => m.year))].sort((a, b) => b.localeCompare(a))
}

/** Maps a Payload doc to the shape the committee components render. */
export function toCommitteeMember(doc: Committee): CommitteeMember {
  // At depth 1 the portrait arrives populated; anything else (depth 0, a
  // deleted relation) degrades to an empty img rather than a crash.
  const portrait = typeof doc.portrait === "object" ? doc.portrait : null

  return {
    id: String(doc.id),
    name: doc.name,
    role: doc.role,
    department: doc.department,
    img: portrait?.url ?? "",
    year: doc.year,
    // Empty strings coalesce to undefined so the UI hides what's unset.
    university: doc.university || undefined,
    course: doc.course || undefined,
    linkedin_url: doc.linkedin_url || undefined,
    bio: doc.bio || undefined,
  }
}
