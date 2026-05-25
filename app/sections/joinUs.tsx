'use client'

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { JoinUs }  from "@/components/TextSVG";
import Button from "@/components/Button";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

export default function JoinUsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   gsap.fromTo(
      ".joinus",
      { drawSVG: 0 },
      {
        drawSVG: "100%",
        duration: 0.3,
        stagger: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      }
   )
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-yellow-500">
      <div className="container grid grid-cols-1 lg:grid-cols-[2fr_1fr] items-center gap-8 lg:gap-16 py-20 md:py-28 lg:py-32">
        <div className="flex flex-col gap-4">
          <span className="eyebrow text-red-600">Membership is free</span>
          <span className="title text-blue-600">
            Jom <span className="inline-block translate-y-[0.67em] scale-110 origin-center"><JoinUs /></span> ⸺ the community is waiting.
          </span>
        </div>

        <div className="justify-self-start lg:justify-self-end">
          <Button className="px-8">Become a Member <span>&rarr;</span></Button>
        </div>
      </div>
    </section>
  );
}