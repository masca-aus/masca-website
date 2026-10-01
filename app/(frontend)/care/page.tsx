import type { Metadata } from "next";

import Button from "@/components/Button";
import { pageMetadata } from "@/utils/seo";
import CarePathways from "./CarePathways";

export const metadata: Metadata = pageMetadata({
  title: "Cares",
  description:
    "A welcoming starting point for student welfare, rights and advocacy across the MASCA community.",
  path: "/care",
});

export default function MascaCaresPage() {
  return (
    <main id="main" className="overflow-hidden bg-white">
      <section className="relative isolate flex min-h-[42rem] items-center overflow-hidden bg-blue-600 pb-24 pt-40 text-white md:pb-32 md:pt-48">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-12 top-20 h-64 w-64 rounded-full border border-yellow-500/25" />
        <div className="pointer-events-none absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-blue-500/35 blur-3xl" />

        <div className="container relative grid items-end gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.65fr)]">
          <div className="max-w-4xl">
            <span className="eyebrow text-yellow-500">welfare &middot; rights &middot; advocacy</span>
            <h1 className="mt-6 text-5xl leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              You don&apos;t have to figure it out{" "}
              <span className="font-accent font-normal text-yellow-500">alone.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-blue-100 md:text-xl">
              Start with what feels closest to your situation. We&apos;ll help you find a clear next step.
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

          <aside className="rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm md:p-8">
            <span className="eyebrow text-yellow-500">need help now?</span>
            <p className="mt-4 font-secondary text-2xl font-semibold leading-snug text-white">
              If something feels urgent, start here and we&apos;ll point you toward immediate help.
            </p>
            <a
              href="#quick-support"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-bold text-white underline decoration-yellow-500 decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-500"
            >
              View immediate help <span aria-hidden>&darr;</span>
            </a>
          </aside>
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
