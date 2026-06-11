import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import { CHAPTERS, getUpcomingEvents } from "@/utils/events";
import EventSection from "./EventSection";

export const metadata: Metadata = pageMetadata({
  title: "Events",
  description:
    "Malaysian student events across Australia — every chapter, every month, all in one place. Filter by state to find what's happening near you.",
  path: "/events",
});

export default async function EventPage() {
  const events = await getUpcomingEvents();

  return (
    <main>
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-24 max-w-2xl space-y-4">
          <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase">
            Events Calendar
          </span>
          <p className="text-base leading-relaxed text-blue-100/80 md:text-lg max-w-xl">
            Every chapter, every month, all in one place. Filter by state to find what&apos;s happening near you.
          </p>
        </div>
      </section>
      
      <EventSection events={events} chapters={CHAPTERS} />
    </main>
  );
}