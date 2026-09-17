import Button from "@/components/Button"
import { CMS_EVENT_CHAPTERS, getApprovedUpcomingEvents } from "@/features/events/publicEvents"

import EventShowcaseGrid from "./eventShowcaseGrid"

export default async function EventShowcaseSection() {
  // An unreachable calendar reads as "nothing right now" here; the /events
  // page is where the distinction is worth spelling out.
  const events = (await getApprovedUpcomingEvents().catch(() => [])).slice(0, 3)

  return (
    // Soft blue tint so the band reads as its own section after the white
    // states grid; the white event cards sit on it with their shadows.
    <section className="bg-blue-50">
      <div className="flex flex-col gap-8 container section-pad">
        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">What&apos;s on kawan-kawan</span>
          <h2 className="title text-blue-600">Upcoming Events</h2>
        </header>

        <p className="text-gray-700">
          From Malaysia Night galas to study sessions and durian-eating competitions.
          <br /> Pick something, bring a friend, jom!
        </p>

        {events.length === 0 ? (
          <p className="text-gray-500">No upcoming events right now — check back soon!</p>
        ) : (
          <>
            <EventShowcaseGrid events={events} chapters={CMS_EVENT_CHAPTERS} />
            <div className="flex justify-end">
              <Button href="/events" variant="outline">
                More Events <span aria-hidden>&rarr;</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
