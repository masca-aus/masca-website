import type { Metadata } from "next";

import Button from "@/components/Button";
import { pageMetadata } from "@/utils/seo";
import CarePathways from "./CarePathways";

export const metadata: Metadata = pageMetadata({
  title: "Cares",
  description:
    "Resources, support and community for Malaysian students settling into life in Australia.",
  path: "/care",
});

export default function MascaCaresPage() {
  return (
    <main id="main" className="overflow-hidden bg-white">
      <section className="relative isolate flex min-h-[42rem] items-center overflow-hidden bg-blue-600 pb-24 pt-40 text-white md:pb-32 md:pt-48">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-12 top-20 h-64 w-64 rounded-full border border-yellow-500/25" />
        <div className="pointer-events-none absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-blue-500/35 blur-3xl" />

        <div className="container relative">
          <div className="max-w-4xl">
            <span className="eyebrow text-yellow-500">MASCA CARES &middot; WELFARE &middot; SUPPORT &middot; COMMUNITY</span>
            <h1 className="mt-6 text-5xl leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              Life in Australia, made a little <span className="font-accent font-normal text-yellow-500">easier.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-blue-100 md:text-xl">
              From wellbeing and finances to academics and settling into life in Australia, find the resources, support and contacts you need &mdash; with your Malaysian student community behind you.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button href="#choose-a-path" variant="accent">
                Find your next step <span aria-hidden>&rarr;</span>
              </Button>
              <Button href="/contact" variant="outlineLight">
                Talk to MASCA
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="helplines-heading" className="bg-blue-50">
        <div className="container section-pad">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow text-red-600">save these contacts</span>
            <h2 id="helplines-heading" className="mt-4 text-blue-600">Help is one call away.</h2>
            <p className="mt-5 text-gray-700">Keep these trusted contacts close.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-xl border border-red-100 bg-white p-6 shadow-sm md:p-7">
              <span className="eyebrow text-red-600">immediate danger</span>
              <h3 className="mt-3 font-secondary text-2xl font-bold text-blue-600">Triple Zero</h3>
              <p className="mt-3 min-h-16 leading-relaxed text-gray-700">
                Call for police, fire or ambulance in a life-threatening emergency.
              </p>
              <a className="mt-5 inline-block text-2xl font-bold text-red-600 underline decoration-yellow-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" href="tel:000">000</a>
            </article>

            <article className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm md:p-7">
              <span className="eyebrow text-blue-600">health advice</span>
              <h3 className="mt-3 font-secondary text-2xl font-bold text-blue-600">Healthcare Australia</h3>
              <p className="mt-3 min-h-16 leading-relaxed text-gray-700">
                Free, 24/7 advice from a registered nurse for non-emergency health concerns.
              </p>
              <a className="mt-5 inline-block text-2xl font-bold text-blue-600 underline decoration-yellow-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" href="tel:1800022222">1800 022 222</a>
            </article>

            <article className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm md:p-7">
              <span className="eyebrow text-blue-600">student support</span>
              <h3 className="mt-3 font-secondary text-2xl font-bold text-blue-600">Education Malaysia Australia</h3>
              <p className="mt-3 min-h-16 leading-relaxed text-gray-700">
                Contact EMA for support and enquiries for Malaysian students in Australia.
              </p>
              <div className="mt-5 flex flex-col items-start gap-1">
                <a className="text-xl font-bold text-blue-600 underline decoration-yellow-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" href="tel:+61293277565">+61 2 9327 7565</a>
                <a className="text-xl font-bold text-blue-600 underline decoration-yellow-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600" href="tel:+61293277596">+61 2 9327 7596</a>
              </div>
            </article>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 rounded-xl bg-blue-600 px-6 py-8 text-center text-white md:flex-row md:justify-between md:px-9 md:text-left">
            <div>
              <h3 className="font-secondary text-2xl font-bold text-white">Keep help close, even offline.</h3>
              <p className="mt-2 max-w-2xl text-blue-100">Download the emergency numbers card so these contacts are there when you need them, even without internet.</p>
            </div>
            <Button href="/care-emergency-numbers.pdf" variant="accent" className="shrink-0" target="_blank" rel="noopener">
              Download PDF
            </Button>
          </div>
        </div>
      </section>

      <CarePathways />

      <section id="quick-support" className="bg-blue-50">
        <div className="container section-pad">
          <div className="rounded-xl bg-blue-600 px-7 py-10 text-center shadow-brand md:px-12 md:py-14">
            <span className="eyebrow text-yellow-500">still unsure?</span>
            <h2 className="mx-auto mt-4 max-w-3xl text-white">Begin with one conversation.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-blue-100">
              Tell us where you are and what you need. We&apos;ll help you find the right place to start.
            </p>
            <Button href="/contact" variant="accent" className="mt-8">
              Talk to MASCA <span aria-hidden>&rarr;</span>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
