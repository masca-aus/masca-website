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
