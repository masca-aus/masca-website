'use client'

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { writeInOnScroll } from "@/utils/animation";
import Button from "@/components/Button";
import SponsorsMarquee from "@/components/SponsorsMarquee";

export default function BukuLatihanSection({ sponsors }: { sponsors: string[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   writeInOnScroll(".marking", sectionRef.current)
  }, { scope: sectionRef })

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#FFFEF8] font-accent [--rule:clamp(2rem,8vw,6rem)]"
    >

      {/* Header */}
      <header
        className="relative w-full h-24 border-b-2 border-[#A8C8E8] bg-no-repeat bg-[linear-gradient(to_right,transparent_var(--rule),#E89090_var(--rule),#E89090_calc(var(--rule)+0.125rem),transparent_calc(var(--rule)+0.125rem))]"
      >
        <div
          className="flex h-full items-center justify-between pr-5 pl-[calc(var(--rule)+0.75rem)] text-sm text-gray-600"
        >
          <h1 className="text-gray-700">
            Our Sponsors
          </h1>
          <span className="text-gray-700 text-2xl md:text-3xl">
            {today}
          </span>
        </div>
      </header>

      {/* Lined area */}
      <div
        className="relative w-full h-75 overflow-hidden bg-[linear-gradient(to_right,transparent_var(--rule),#E89090_var(--rule),#E89090_calc(var(--rule)+0.125rem),transparent_calc(var(--rule)+0.125rem)),repeating-linear-gradient(transparent,transparent_1.9375rem,#A8C8E8_1.9375rem,#A8C8E8_2rem)] bg-size-[100%_100%,100%_2rem] [background-repeat:no-repeat,repeat]"
      >

        {/* Sponsor logos — full-bleed marquee, vertically centered over the ruled lines */}
        <div className="absolute inset-x-0 top-2/5 -translate-y-1/2">
          <SponsorsMarquee logos={sponsors} />
        </div>

        {/* Sponsorship CTA — written on the bottom rule, after the margin */}
        <p className="absolute bottom-0 left-0 pb-3 pl-[calc(var(--rule)+0.75rem)] pr-5 font-primary text-base font-semibold leading-8 text-gray-700">
          Interested in sponsoring us?{" "}
          <Button variant="ghost" href="/contact" className="font-extrabold">
            Contact Us &rarr;
          </Button>
        </p>

      </div>

      {/* Teacher's mark */}
      {/* <div className="absolute bottom-8 right-10 w-28 -rotate-6">
        <Marking />
      </div> */}
    </section>
  )
}