import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import { getCommittee, getCommitteeYears } from "@/utils/committee";
import CommitteeSection from "./CommitteeSection";

export const metadata: Metadata = pageMetadata({
  title: "Committee",
  description:
    "Meet the student leaders behind the Malaysian Students' Council of Australia — the national committee representing Malaysian students across every chapter.",
  path: "/committee",
});

export default async function CommitteePage() {
  const members = await getCommittee();
  const years = getCommitteeYears(members);

  return (
    <main id="main">
      <HeroBand />

      {members.length > 0 ? (
        <CommitteeSection members={members} years={years} />
      ) : (
        <EmptyYearbook />
      )}
    </main>
  );
}

// Same hero recipe as /about and /care: brand-blue band, yellow eyebrow,
// soft blue-100 body. The brush script picks out the phrase the whole page
// is built around.
function HeroBand() {
  return (
    <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
      <div className="container flex flex-col gap-6">
        <span className="eyebrow text-yellow-500">the yearbook</span>
        <h1 className="max-w-3xl text-white text-4xl md:text-5xl lg:text-6xl">
          Meet the students{" "}
          <span className="font-accent font-normal text-yellow-500">
            steering MASCA
          </span>
        </h1>
        <p className="max-w-xl text-blue-100/80 md:text-lg">
          Elected each year to represent Malaysian students across Australia —
          these are the faces behind the council.
        </p>
      </div>
    </section>
  );
}

function EmptyYearbook() {
  return (
    <section>
      <div className="container flex flex-col items-center gap-6 py-32 text-center">
        <span className="font-accent text-3xl leading-tight text-red-600 -rotate-2 md:text-4xl">
          nobody&rsquo;s signed the yearbook yet!
        </span>
        <p className="max-w-md text-gray-700">
          The committee portraits are still at the printers. Once the new team
          is sworn in, their faces appear here — ties straightened, smiles
          rehearsed, ready to make a big country feel a little smaller.
        </p>
      </div>
    </section>
  );
}
