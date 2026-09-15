import type { Metadata } from "next";

import Button from "@/components/Button";
import { pageMetadata } from "@/utils/seo";
import { EventSubmissionForm } from "./EventSubmissionForm";

export const metadata: Metadata = pageMetadata({
  title: "Submit an event",
  description: "Submit a Malaysian student or community event to MASCA for review.",
  path: "/submit/event",
});

export default function EventSubmitPage() {
  return (
    <main id="main">
      <section className="flex min-h-80 flex-col justify-center bg-blue-600 pt-48 pb-32">
        <div className="container flex flex-col gap-6">
          <span className="eyebrow text-yellow-500">community calendar</span>
          <h1 className="max-w-3xl text-4xl text-white md:text-5xl lg:text-6xl">
            Submit an <span className="font-accent font-normal text-yellow-500">event</span>
          </h1>
          <p className="max-w-xl text-blue-100/80 md:text-lg">
            Tell us what&apos;s happening and our team will review it for the MASCA events calendar.
          </p>
        </div>
      </section>

      <section className="container section-pad">
        <div className="mb-10">
          <Button
            href="/events"
            variant="ghost"
            className="motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span aria-hidden>&larr;</span> Back to Events
          </Button>
        </div>
        <EventSubmissionForm />
      </section>
    </main>
  );
}
