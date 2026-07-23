import Button from "@/components/Button"
import { CHAPTERS, getUpcomingEvents } from "@/utils/events"

import EventShowcaseGrid from "./eventShowcaseGrid"

export default async function EventShowcaseSection() {
  // Fetch hits the same cached Eventbrite response as /events (revalidate: 1h
  // in utils/events.ts), so this doesn't cost an extra API call.
  const events = (await getUpcomingEvents()).slice(0, 3)

  return (
    <section>
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
            <EventShowcaseGrid events={events} chapters={CHAPTERS} />
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