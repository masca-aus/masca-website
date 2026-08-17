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
      <div className="container flex items-center gap-12 md:gap-16 min-h-svh pt-24 pb-16 md:pt-28">
        <div className="flex-1">
            <MainContent />
        </div>

        {/* <div className="hidden lg:flex flex-1 justify-center">
            {upcomingEvent}
        </div> */}
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
