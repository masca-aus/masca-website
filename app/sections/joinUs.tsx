'use client'

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { JoinUs }  from "@/components/TextSVG";
import Button from "@/components/Button";
import { writeInOnScroll } from "@/utils/animation";

export default function JoinUsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   writeInOnScroll(".joinus", sectionRef.current)
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-yellow-500">
      <div className="container grid grid-cols-1 lg:grid-cols-[2fr_1fr] items-center gap-8 lg:gap-16 py-20 md:py-28 lg:py-32">

        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Membership is free</span>
          <span className="title text-blue-600">
            Jom <span className="inline-block translate-y-[0.67em] scale-110 origin-center"><JoinUs /></span> ⸺ the community is waiting.
          </span>
        </header>

        <div className="justify-self-start lg:justify-self-end">
          <Button href="/sign-up" className="px-8">Become a Member <span>&rarr;</span></Button>
        </div>
        
      </div>
    </section>
  );
}