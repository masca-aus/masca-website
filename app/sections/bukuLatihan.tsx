'use client'

import { useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";


import { Marking } from "@/components/TextSVG"; 

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);


export default function BukuLatihanSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   gsap.fromTo(
      ".marking",
      { drawSVG: 0 },
      {
        drawSVG: "100%",
        duration: 0.3,
        stagger: 0.25,
        ease: "entranceEase",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      }
   )
  }, { scope: sectionRef })

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#FFFEF8] font-accent"
      style={{ "--rule": "clamp(2rem, 8vw, 6rem)" } as CSSProperties}
    >

      {/* Header */}
      <div
        className="relative w-full h-24 border-b-2 border-[#A8C8E8]"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent var(--rule), #E89090 var(--rule), #E89090 calc(var(--rule) + 0.125rem), transparent calc(var(--rule) + 0.125rem))",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="flex h-full items-center justify-between pr-5 text-sm text-gray-600"
          style={{ paddingLeft: "calc(var(--rule) + 0.75rem)" }}
        >
          <h1 className="text-gray-700">
            Our Sponsors
          </h1>
          <span className="text-gray-700 text-2xl md:text-3xl">
            {today}
          </span>
        </div>
      </div>

      {/* Lined area */}
      <div
        className="relative w-full h-75 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent var(--rule), #E89090 var(--rule), #E89090 calc(var(--rule) + 0.125rem), transparent calc(var(--rule) + 0.125rem)), repeating-linear-gradient(transparent, transparent 1.9375rem, #A8C8E8 1.9375rem, #A8C8E8 2rem)",
          backgroundSize: "100% 100%, 100% 2rem",
          backgroundRepeat: "no-repeat, repeat",
        }}
      >
        <div className="pr-5 text-base leading-8 text-gray-700" style={{ paddingTop: "2rem", paddingLeft: "calc(var(--rule) + 0.75rem)" }}>
          1 + 1 = 2
        </div>
      </div>

      {/* Teacher's mark */}
      <div className="absolute bottom-8 right-10 w-28 -rotate-6">
        <Marking />
      </div>
    </section>
  )
}