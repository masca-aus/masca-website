import type { Metadata } from "next";

import Button from "@/components/Button";
import { CHAPTERS, tryGetUpcomingEvents } from "@/utils/events";
import { pageMetadata } from "@/utils/seo";
import EventSection from "./EventSection";

export const metadata: Metadata = pageMetadata({
  title: "Events",
  description:
    "Malaysian student events across Australia — every chapter, every month, all in one place. Filter by state to find what's happening near you.",
  path: "/events",
});

export default async function EventPage() {
  // `null` means Eventbrite couldn't be reached; the page still renders with
  // an "unavailable" band instead of taking the route down.
  const events = await tryGetUpcomingEvents();

  return (
    <main id="main">
      <HeroBand />

      {events === null ? (
        <CalendarEmpty
          accent="the calendar took a teh tarik break"
          body="We couldn't reach the events calendar just now. Give it a minute and try again — the events aren't going anywhere."
        />
      ) : events.length === 0 ? (
        <CalendarEmpty
          accent="nothing on the calendar yet, lah"
          body="Chapters post their events through the semester. Check back soon — or follow us on Instagram to hear about the next one first."
        />
      ) : (
        <EventSection events={events} chapters={CHAPTERS} />
      )}

      <CtaBand />
    </main>
  );
}

// Same hero recipe as /about, /committee and /careers: brand-blue band,
// yellow eyebrow, soft blue-100 body. The brush script picks out the phrase
// the whole page is built around.
function HeroBand() {
  return (
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">what&apos;s on &middot; events calendar</span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">
          Every chapter, every month,{" "}
          <span className="font-accent font-normal text-yellow-500">all in one place</span>
        </h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">
          From Malaysia Night galas to study sessions and durian-eating competitions.
          Filter by chapter to find what&apos;s happening near you, then bring a friend — jom!
        </p>
      </div>
    </section>
  );
}

// Empty states in the BoardEmpty recipe from /careers: a brush-script line in
// brand red, a short gray paragraph, one or two actions.
function CalendarEmpty({ accent, body }: { accent: string; body: string }) {
  return (
    <section>
      <div className="container flex flex-col items-center gap-6 py-32 text-center">
        <span className="-rotate-2 font-accent text-3xl leading-tight text-red-600 md:text-4xl">
          {accent}
        </span>
        <p className="max-w-md text-gray-700">{body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          <Button
            href="https://www.instagram.com/masca_national/"
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
          >
            Follow on Instagram <span aria-hidden>&rarr;</span>
          </Button>
          <Button href="/contact" variant="outline">
            Get in touch
          </Button>
        </div>
      </div>
    </section>
  );
}

// Closing band mirrors /about and /careers: the onward journey here is
// chapters and societies with an event to list.
function CtaBand() {
  return (
    <section className="bg-blue-600">
      <div className="container section-pad flex flex-col items-center gap-6 text-center">
        <span className="eyebrow text-yellow-500">hosting something?</span>
        <h2 className="title max-w-2xl text-white">
          Running an event?{" "}
          <span className="font-accent font-normal text-yellow-500">Get it on the calendar</span>
        </h2>
        <p className="max-w-xl text-gray-300">
          Chapters, student societies and partners — send us the details and we&apos;ll
          help you get the word out to Malaysians across Australia.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Button href="/contact" variant="accent">
            Tell us about it <span aria-hidden>&rarr;</span>
          </Button>
          <Button href="/committee" variant="outlineLight">
            Meet the team
          </Button>
        </div>
      </div>
    </section>
  );
}
