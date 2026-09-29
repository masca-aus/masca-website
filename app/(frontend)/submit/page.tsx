import type { Metadata } from "next";

import Button from "@/components/Button";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Submit to MASCA",
  description: "Share an event with MASCA for review and possible publication.",
  path: "/submit",
});

export default function SubmitPage() {
  return (
    <main id="main">
      <section className="flex min-h-80 flex-col justify-center bg-blue-600 pt-48 pb-32">
        <div className="container flex flex-col gap-6">
          <span className="eyebrow text-yellow-500">share with the community</span>
          <h1 className="max-w-3xl text-4xl font-accent font-normal text-yellow-500 md:text-5xl lg:text-6xl">
            Submit to MASCA
          </h1>
          <p className="max-w-xl text-blue-100/80 md:text-lg">
            Help Malaysian students across Australia discover what your community is planning.
          </p>
        </div>
      </section>

      <section className="container section-pad">
        <div className="max-w-3xl rounded-xl border-2 border-blue-100 bg-blue-50 p-8 shadow-md md:p-10">
          <span className="eyebrow text-red-600">events</span>
          <h2 className="mt-3 text-blue-600">Put your event on our radar</h2>
          <p className="mt-4 max-w-2xl text-gray-700">
            Send your event details to the MASCA team for review. We welcome submissions from
            chapters, Malaysian student societies and community partners.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Button
              href="/submit/event"
              variant="primary"
              className="motion-reduce:transform-none motion-reduce:transition-none"
            >
              Submit an event <span aria-hidden>&rarr;</span>
            </Button>
            <Button
              href="/events"
              variant="ghost"
              className="motion-reduce:transform-none motion-reduce:transition-none"
            >
              Back to Events
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
