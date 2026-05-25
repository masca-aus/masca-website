'use client'

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

import { JoinUs }  from "@/components/TextSVG";
import Button from "@/components/Button";

gsap.registerPlugin(DrawSVGPlugin);

export default function JoinUsSection() {
  useGSAP(() => {
   gsap.fromTo(
      ".joinus",
      { drawSVG: 0 },
      { drawSVG: "100%", duration: 0.3, stagger: 0.25, ease: "none" }
   )
  })

  return (
    <section className="flex flex-col gap-4 py-32 px-8 md:px-16 lg:px-24 xl:px-32 bg-yellow-500">
        <span className="eyebrow text-red-600">Membership is free</span>
        <span className="text-blue-600 text-h2 font-bold inline-flex gap-4">
          Jom <JoinUs /> ⸺ the community is waiting. 
        </span>

        {/* TODO: add join now button, use grid with two cols */}
    </section>
  );
}