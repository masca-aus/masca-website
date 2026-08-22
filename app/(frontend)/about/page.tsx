import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import Button from "@/components/Button";
import StorySection from "./StorySection";
import PillarsSection from "./PillarsSection";
import ValuesSection from "./ValuesSection";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Established in 2001, MASCA is the independent, non-profit peak body for Malaysian students in Australia — recognised by Education Malaysia Australia and carrying the Spirit of Malaysia Down Under.",
  path: "/about",
});

export default function AboutUsPage() {
  return (
    <main id="main">
      <HeroBand />
      <StorySection />
      <PillarsSection />
      <ValuesSection />
      <CtaBand />
    </main>
  );
}

// Same hero recipe as /committee and /care: brand-blue band, yellow eyebrow,
// soft blue-100 body. The h1 leads with the tagline; the brush script picks
// out the phrase the whole page is built around.
function HeroBand() {
  return (
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">
          our story &middot; est. 2001
        </span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">
          Carrying the{" "}
          <span className="font-accent font-normal text-yellow-500">
            Spirit of Malaysia
          </span>{" "}
          Down Under
        </h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">
          The Malaysian Students&apos; Council of Australia — independent,
          non-profit, and non-partisan — is the peak representative body of
          Malaysian students in Australia. This is who we are, and why
          we&apos;re here.
        </p>
      </div>
    </section>
  );
}

// Closing band mirrors the home hero's two-button pattern and routes visitors
// to the two live onward journeys: the people, and the inbox.
function CtaBand() {
  return (
    <section className="bg-blue-600">
      <div className="container section-pad flex flex-col items-center gap-6 text-center">
        <span className="eyebrow text-yellow-500">carry the spirit</span>
        <h2 className="title max-w-2xl text-white">
          The spirit travels with its people.
        </h2>
        <p className="max-w-xl text-gray-300">
          Meet the student leaders keeping the campfire lit this year — or drop
          us a line and find your place in the family.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Button href="/committee" variant="accent">
            Meet the team <span aria-hidden>&rarr;</span>
          </Button>
          <Button href="/contact" variant="outlineLight">
            Get in touch
          </Button>
        </div>
      </div>
    </section>
  );
}
