'use client'

import { useRef, useState } from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { InAustralia }  from "@/components/TextSVG";
import Button from "@/components/Button";
import { Briefcase } from "lucide-react";
import AustraliaChapterMap from "../_components/AustraliaChapterMap";
import LandmarkBackdrop from "../_components/LandmarkBackdrop";
import StatisticSection from "./statistic";


export default function HeroSection() {
  const [selectedCode, setSelectedCode] = useState("NSW");
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    gsap.set(".inAustralia", { autoAlpha: 1 })
    gsap.effects.writeInOnScroll(".stroke", { trigger: sectionRef.current });
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="relative isolate flex flex-1 flex-col overflow-hidden bg-blue-600">
      <LandmarkBackdrop selectedCode={selectedCode} />
      <div className="relative z-10 mx-auto flex w-full max-w-[1760px] flex-1 flex-col items-center gap-12 px-8 pt-24 pb-16 md:px-16 md:pt-28 lg:flex-row lg:gap-20 lg:px-20 lg:pt-32 lg:pb-16 2xl:gap-24 2xl:px-24">
        <div className="w-full lg:flex-1">
            <MainContent />
        </div>

        <div id="states" className="flex w-full justify-center scroll-mt-24 lg:flex-1">
          <div className="w-full lg:max-w-[440px] 2xl:max-w-[500px]">
            <h2 className="sr-only">Find your MASCA chapter</h2>
            <AustraliaChapterMap selectedCode={selectedCode} onSelectedCodeChange={setSelectedCode} />
          </div>
        </div>
      </div>
      <StatisticSection />
    </section>
  );
}

function MainContent() {
  return (
    <header className="flex flex-col gap-6 justify-center">
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
