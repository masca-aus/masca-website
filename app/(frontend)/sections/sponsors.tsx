import Button from "@/components/Button";
import SponsorsMarquee from "@/app/(frontend)/sections/SponsorsMarquee";
import type { Sponsor } from "@/utils/sponsors";

export default function SponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <section className="bg-gray-100 py-24 md:py-28">
      <div className="container flex flex-col gap-4">
        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Powered by our partners</span>
          <span className="title text-blue-600">Our Sponsors</span>
        </header>

        <p className="text-gray-700">
          From orientation BBQs to Malaysia Night, these organisations help us keep
          the lights on and the rendang warm. Terima kasih, kawan-kawan!
        </p>
      </div>

      {sponsors.length > 0 ? (
        /* Full-bleed logo marquee; edge fades melt the rail into the section */
        <div className="relative my-12">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-gray-100 to-transparent md:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-gray-100 to-transparent md:w-32" />
          <SponsorsMarquee sponsors={sponsors} />
        </div>
      ) : (
        <EmptyMarquee />
      )}

      <div className="container flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-secondary text-lg italic text-blue-600">
          Want to see your logo up here?
        </p>
        <Button href="/contact" variant="outline">
          Become a Sponsor <span aria-hidden>&rarr;</span>
        </Button>
      </div>
    </section>
  );
}

// The collection starts empty — better an honest joke than fake logos.
function EmptyMarquee() {
  return (
    <div className="container my-12 flex flex-col items-center gap-4 py-8 text-center">
      <span className="font-accent text-3xl leading-tight text-red-600 -rotate-2 md:text-4xl">
        sponsor slot open &mdash; inquire within!
      </span>
      <p className="max-w-md text-gray-700">
        This marquee is warmed up and ready to scroll, but the logos haven&rsquo;t
        arrived yet. Your brand could be doing laps across it right now &mdash;
        picture it gliding past, freshly fed on nasi lemak.
      </p>
    </div>
  );
}