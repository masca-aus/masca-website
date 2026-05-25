'use client'

import { useRef } from "react";
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
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section ref={sectionRef} className="relative bg-[#FFFEF8]">

      {/* Header */}
      <div
        className="relative w-full h-16 border-b-2 border-[#A8C8E8]"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent clamp(2rem, 8vw, 6rem), #E89090 clamp(2rem, 8vw, 6rem), #E89090 calc(clamp(2rem, 8vw, 6rem) + 0.125rem), transparent calc(clamp(2rem, 8vw, 6rem) + 0.125rem))",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex h-full items-center justify-between px-30 pr-5 text-sm text-gray-600">
          <h1 className="font-base text-gray-700">
            Our Sponsors
          </h1>
          <span className="text-gray-700">
            {today}
          </span>
        </div>
      </div>

      {/* Lined area */}
      <div
        className="relative w-full h-75 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent clamp(2rem, 8vw, 6rem), #E89090 clamp(2rem, 8vw, 6rem), #E89090 calc(clamp(2rem, 8vw, 6rem) + 0.125rem), transparent calc(clamp(2rem, 8vw, 6rem) + 0.125rem)), repeating-linear-gradient(transparent, transparent 1.9375rem, #A8C8E8 1.9375rem, #A8C8E8 2rem)",
          backgroundSize: "100% 100%, 100% 2rem",
          backgroundRepeat: "no-repeat, repeat",
        }}
      >
        <div className="pl-30 pr-5 text-base leading-8 text-gray-700" style={{ paddingTop: "2rem" }}>
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