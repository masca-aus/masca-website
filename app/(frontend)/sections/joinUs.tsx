'use client'

import gsap from "gsap"
import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { JoinUs }  from "@/components/TextSVG";
import Button from "@/components/Button";

export default function JoinUsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   gsap.effects.writeInOnScroll(".joinus", { trigger: sectionRef.current });
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-yellow-500">
      <div className="container section-pad grid grid-cols-1 lg:grid-cols-[2fr_1fr] items-center gap-8 lg:gap-16">

        <header className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Membership is free</span>
          <h2 className="title text-blue-600">
            Jom <span className="inline-block translate-y-[0.67em] scale-110 origin-center"><JoinUs /></span> ⸺ the community is waiting.
          </h2>
        </header>

        <div className="justify-self-start lg:justify-self-end">
          <Button href="/events" className="px-8">See What&apos;s Happening<span>&rarr;</span></Button>
        </div>
        
      </div>
    </section>
  );
}