'use client'

import { useRef, type ReactNode } from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { InAustralia }  from "@/components/TextSVG";
import Button from "@/components/Button";
import { Briefcase } from "lucide-react";
import HeroSilhouettes from "./heroSilhouttes";


export default function HeroSection({ chapterMap }: { chapterMap: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.set(".inAustralia", { autoAlpha: 1 })
    gsap.effects.writeInOnScroll(".stroke", { trigger: sectionRef.current });
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-blue-600">
      <HeroSilhouettes className="-z-10" />
      <div className="container flex min-h-svh flex-col items-center gap-12 pt-24 pb-16 md:pt-28 lg:flex-row lg:gap-16 z-10">
        <div className="w-full lg:flex-1">
            <MainContent />
        </div>

        <div id="states" className="flex w-full justify-center scroll-mt-24 lg:flex-1">
          <div className="w-full max-w-[520px]">
            <p className="eyebrow mb-3 text-yellow-500">Find your state, find your people</p>
            {chapterMap}
          </div>
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
        <Button href="/careers" variant="outlineLight">
          <Briefcase /> Careers Board
        </Button>
      </div>
    </header>
  );
}
