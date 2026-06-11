import type { Metadata } from "next";

import { pageMetadata } from "@/utils/seo";
import { getCommittee, getCommitteeYears } from "@/utils/committee";
import CommitteeSection from "./CommitteeSection";

// Statically render the page and regenerate it at most once every 30 minutes
// (ISR). Visitors get instant cached HTML; Notion is only queried in the
// background when the cache goes stale.
export const revalidate = 1800;

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
    <main>
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

      <CommitteeSection members={members} years={years} />
    </main>
  );
}
