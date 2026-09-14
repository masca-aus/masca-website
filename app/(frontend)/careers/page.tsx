import type { Metadata } from "next";

import Button from "@/components/Button";
import { getCareerBoard } from "@/utils/careersSource";
import { pageMetadata } from "@/utils/seo";
import BoardEmpty from "./BoardEmpty";
import CareerBoard from "./CareerBoard";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description:
    "Internships, graduate programs and part-time roles for Malaysian students in Australia — working rights spelled out, closing dates up front. Curated by the MASCA Careers team.",
  path: "/careers",
});

// The sheet fetch already revalidates every 5 minutes; this makes the page
// re-check on the same clock even when the sheet isn't configured yet.
export const revalidate = 300;

export default async function CareersPage() {
  // Throws when the sheet can't be read, so ISR keeps serving the last good
  // page (see utils/careersSource.ts); a missing env var is a normal state.
  const board = await getCareerBoard();

  return (
    <main id="main">
      <HeroBand />

      {board.status === "ok" && board.jobs.length > 0 ? (
        <CareerBoard jobs={board.jobs} />
      ) : (
        <section>
          <BoardEmpty
            variant={board.status === "ok" ? "none" : "unconfigured"}
            actions={
              board.status === "ok" ? (
                <Button href="/contact" variant="primary">
                  Suggest an employer <span aria-hidden>&rarr;</span>
                </Button>
              ) : (
                <Button href="/contact" variant="outline">
                  Tell us about a role
                </Button>
              )
            }
          />
        </section>
      )}

      <CtaBand />
    </main>
  );
}

// Same hero recipe as /about and /committee: brand-blue band, yellow eyebrow,
// soft blue-100 body. The brush script picks out the phrase the whole page
// is built around.
function HeroBand() {
  return (
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">masca careers &middot; the jobs board</span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">
          Jom, find your{" "}
          <span className="font-accent font-normal text-yellow-500">next big break</span>
        </h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">
          Internships, graduate programs, part-time gigs and roles back home — hand-picked
          by the MASCA Careers team, with working rights spelled out so you never waste a
          cover letter.
        </p>
      </div>
    </section>
  );
}

// Closing band mirrors /about: the onward journey here is employers, alumni
// and societies with a role to list.
function CtaBand() {
  return (
    <section className="bg-blue-600">
      <div className="container section-pad flex flex-col items-center gap-6 text-center">
        <span className="eyebrow text-yellow-500">hiring?</span>
        <h2 className="title max-w-2xl text-white">
          Hiring Malaysian students?{" "}
          <span className="font-accent font-normal text-yellow-500">Post a role</span>
        </h2>
        <p className="max-w-xl text-gray-300">
          Listings are free for employers, alumni and student societies. Send us the details
          and the Careers team will have it on the board within the week.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Button href="/contact" variant="accent">
            Post a role <span aria-hidden>&rarr;</span>
          </Button>
          <Button href="mailto:careers@masca.org.au" variant="outlineLight">
            Email careers@masca.org.au
          </Button>
        </div>
      </div>
    </section>
  );
}
