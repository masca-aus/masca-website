'use client'

import { useRef, type ReactNode } from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { InAustralia }  from "@/components/TextSVG";
import Button from "@/components/Button";


export default function HeroSection({ upcomingEvent }: { upcomingEvent: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.set(".inAustralia", { autoAlpha: 1 })
    gsap.effects.writeInOnScroll(".stroke", { trigger: sectionRef.current });
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-blue-600">
      {/* Fills one viewport (dvh, not vh — stable under mobile browser chrome).
          pt clears the fixed navbar; content-center soaks up any remaining
          height evenly instead of the old spacer rows piling it below the stats. */}
      <div
      className="
          container grid content-center gap-12 md:gap-16 min-h-[88svh] pt-24 pb-16 md:pt-28
          grid-cols-1 [grid-template-areas:'main'_'stats']
          lg:grid-cols-2 lg:[grid-template-areas:'main_event'_'stats_.']
      "
      >
        <div className="[grid-area:main]">
            <MainContent />
        </div>

        <div className="[grid-area:stats]">
            <Statistic />
        </div>

        <div className="hidden lg:inline-flex lg:[grid-area:event] lg:justify-self-center lg:self-center">
            {upcomingEvent}
        </div>
      </div>
    </section>
  );
}

function MainContent() {
  return (
    <header className="flex flex-col gap-6 justify-center">
      <span className="eyebrow text-yellow-500">
        founded 2001 &middot; 6 states &middot; 1 territory
      </span>
      <h1 className="text-white text-5xl md:text-6xl lg:text-7xl">
        {/* Full brand name in the heading for crawlers and screen readers; the
            creative line below is the visible treatment. */}
        <span className="sr-only">
          Malaysian Students&apos; Council of Australia (MASCA)
        </span>
        <span aria-hidden="true">
          A home for <br /> Malaysians <br /> studying{" "}
          <span className="inAustralia invisible opacity-0"><InAustralia /></span>
        </span>
      </h1>
      <p className="text-gray-300">
        The <strong className="font-semibold">Malaysian Students&apos; Council
        of Australia (MASCA)</strong> is the peak student representative body for
        Malaysians across Australia — built by students, for students. Selamat
        datang, and welcome home.
      </p>
      <div className="flex gap-4">
        <Button href="/events" variant="accent">
          See What&apos;s On <span>&rarr;</span>
        </Button>
        <Button href="/contact" variant="outlineLight">
          Contact Us
        </Button>
      </div>
    </header>
  );
}

function Statistic() {
  const stats = [
    { from: 0, value: 33, suffix: "k+", label: "students reached" },
    { from: 0, value: 7, suffix: "", label: "state chapters" },
    { from: new Date().getFullYear(), value: 2001, suffix: "", label: "founded" },
  ]
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const values = gsap.utils.toArray<HTMLElement>(".stat-value");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      values.forEach((e) => {
        const target = Number(e.dataset.value);
        const from = Number(e.dataset.from);
        const suffix = e.dataset.suffix ?? "";
        const proxy = { val: from };
        gsap.to(proxy, {
          val: target,
          duration: 5,
          ease: "power4.out",
          onUpdate: () => { e.textContent = `${Math.round(proxy.val)}${suffix}`; },
        });
      });
    });

    // Reduced motion: no ticking numbers, just the final figures.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      values.forEach((e) => {
        e.textContent = `${e.dataset.value}${e.dataset.suffix ?? ""}`;
      });
    });
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className="flex gap-4 border-t pt-8 border-blue-100/20">
        {stats.map(({ from, value, suffix, label }) => (
          <div key={label} className="flex flex-col">
            <span
              className="stat-value text-h2 font-bold text-yellow-500"
              data-value={value}
              data-from={from}
              data-suffix={suffix}
            >
              {from}{suffix}
            </span>
            <span className="eyebrow text-gray-300">{label}</span>
          </div>
        ))}
    </div>
  );
}