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
    <section ref={sectionRef} className="grid grid-cols-[2fr_1fr] gap-16 py-32 px-8 md:px-16 lg:px-24 xl:px-32 bg-yellow-500">
      <div className="flex flex-col gap-4 col-1">
        <span className="eyebrow text-red-600">Membership is free</span>
        <span className="text-blue-600 text-h2 font-bold">
          Jom <JoinUs /> ⸺ the community is waiting. 
        </span>
      </div>

      <div className="col-2 justify-self-end self-center">
        <Button className="px-8">Become a Member <span>&rarr;</span></Button>
      </div>
    </section>
  );
}