import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import { getCommittee, getCommitteeYears } from "@/utils/committee";
import CommitteeSection from "./CommitteeSection";

// Statically rendered: Payload is queried once at build time (no per-request
// DB query). afterChange/afterDelete hooks on the committee collection call
// revalidatePath, so an edit in /admin regenerates this page in seconds — no
// ISR timer needed.

export const metadata: Metadata = pageMetadata({
  title: "Committee",
  description:
    "Meet the student leaders behind the Malaysian Students' Council of Australia — the national committee representing Malaysian students across every chapter.",
  path: "/committee",
});

export default async function CommitteePage() {
  // Sorted by `order` here on the server; the client section only ever filters.
  const members = await getCommittee();
  const years = getCommitteeYears(members);

  return (
    <main id="main">
      <section className="flex flex-col justify-center bg-blue-600 pt-48 pb-32 min-h-80">
        <div className="container flex flex-col gap-24 max-w-2xl space-y-4">
          <span className="text-xs font-bold tracking-widest text-yellow-400 uppercase">
            The Yearbook
          </span>
          <p className="text-base leading-relaxed text-blue-100/80 md:text-lg max-w-xl">
            The student leaders steering MASCA — elected each year to represent
            Malaysian students across Australia.
          </p>
        </div>
      </section>

      {members.length > 0 ? (
        <CommitteeSection members={members} years={years} />
      ) : (
        <EmptyYearbook />
      )}
    </main>
  );
}

// The collection starts empty — better an honest joke than fabricated people.
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
