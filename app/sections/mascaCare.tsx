'use client'

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Kita }  from "@/components/TextSVG";
import Button from "@/components/Button";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);
export default function MascaCareSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
   gsap.fromTo(
      ".kita",
      { drawSVG: 0 },
      {
        drawSVG: "100%",
        duration: 0.3,
        stagger: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 20%",
        },
      }
   )
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef}>
      <div className="container grid grid-cols-1 lg:grid-cols-2 items-center gap-24 lg:gap-16 py-32">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className="eyebrow text-red-600">student welfare</span>
            <span className="title text-blue-600">If something&apos;s not right, we&apos;re here</span>
          </div>
          <p className="font-secondary text-blue-600 italic">“Reach out — no judgement, no paperwork, no problem too small.”</p>
          <p className="text-caption text-gray-700">Whether it&apos;s visa worries, mental health, accommodation, or just needing a sambal fix on a hard week — your chapter has trained student leaders ready to listen and connect you to help.</p>
          <Button className="self-start mt-4">Get support <span>&rarr;</span></Button>
        </div>

        <div className="flex justify-center lg:justify-end">
          <article className="relative isolate overflow-hidden flex flex-col justify-center w-full max-w-xl min-h-105 md:min-h-130 rounded-xl bg-blue-600 shadow-brand p-6 md:p-8">
            <span className="eyebrow text-yellow-500">masca care</span>
            <h1 className="text-yellow-500 leading-none mt-2 text-6xl md:text-7xl font-bold">1800 <br/> MASCA</h1>
            <span className="text-caption text-white mt-3">Confidential. Free. Staffed by trained MASCA student leaders.</span>

            <div className="border-t border-blue-100/20 my-6"></div>

            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4">
                <span className="eyebrow text-gray-300/50">email</span>
                <span className="eyebrow text-white">cares@masca.org.au</span>
                <span className="eyebrow text-gray-300/50">walk-in</span>
                <span className="eyebrow text-white">Your nearest chapter office</span>
                <span className="eyebrow text-gray-300/50">Emergency</span>
                <span className="eyebrow text-white">000 first, then us</span>
            </div>

            <span className="pointer-events-none absolute bottom-1 -right-6 w-48 md:w-64 opacity-40 -z-10">
              <Kita />
            </span>
          </article>
        </div>
      </div>
    </section>
  )
}