'use client'

import { gsap } from "gsap"
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { GSDevTools } from "gsap/GSDevTools";

import TraceText from "@/components/TraceText";
import Button from "@/components/Button";

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, GSDevTools)

export default function Home() {
  return (
    <section className="grid grid-rows-[1fr_auto_1fr] min-h-full bg-blue-600 p-8 gap-8">

      {/* main grid - centre */}
      <div className="row-2 grid grid-cols-1 md:grid-cols-2 items-center gap-32 md:gap-16 pb-4">

         {/* subgrid - left */}
         <MainContent />

         {/* subgrid - right */}
         <UpcomingEvent />

      </div>

      <div className="row-3">
         <Statistic />
      </div>

    </section>
  );
}


function MainContent() {
  useGSAP(() => {
    const animation = gsap.fromTo(
      ".stroke",
      { drawSVG: 0 },
      { drawSVG: "100%", duration: 0.3, stagger: 0.25, ease: "none" }
    )

    // testing
    GSDevTools.create({ animation: animation })
  })

   return (
      <div className="flex flex-col gap-6 justify-center md:col-1">
         <span className="eyebrow text-yellow-500">founded 2001 &middot; 6 states &middot; 1 territory</span>
         <h1 className="text-white">
            A home for <br/> Malaysians <br/> studying <TraceText />
         </h1>
         <p 
            className="text-gray-300"
         >
            MASCA is the peak student representative body for Malaysians across Australia — built by students, for students. Selamat datang, and welcome home.
         </p>
         <div className="flex gap-4">
            <Button
               variant="accent"
            >
               Become a Member <span>&rarr;</span>
            </Button>
            <Button 
               variant="outline" 
               className="text-white border-gray-300"
            >
               See Whats On
            </Button>
         </div>
      </div>
   )
}

function Statistic() {
   return (
      <div className="flex gap-8 border-t pt-8 border-blue-100/20">
         <div className="flex flex-col">
            <span className="text-h2 font-bold text-yellow-500">20k+</span>
            <span className="eyebrow text-gray-300">students reached</span>
         </div>
         <div className="flex flex-col">
            <span className="text-h2 font-bold text-yellow-500">7</span>
            <span className="eyebrow text-gray-300">state chapters</span>
         </div>
         <div className="flex flex-col">
            <span className="text-h2 font-bold text-yellow-500">2001</span>
            <span className="eyebrow text-gray-300">founded</span>
         </div>
      </div>
   )
}

function UpcomingEvent() {
   return (
      <div className="flex flex-col gap-4 justify-center items-start border border-blue-100/20 rounded-xl bg-blue-500 mx-8 p-8 md:col-2">
         <span className="eyebrow text-yellow-500">Next Major Event</span>
         <span className="text-white text-xl font-bold">MASCA National Convention 2026</span>
         <div className="flex flex-col gap-1">
            <span className="text-caption text-gray-300">Melbourne 3-5 July 2026</span>
            <span className="text-caption text-gray-300">Hosted by MASCA National</span>
         </div>
         <Button variant="secondary" className="py-1">Early bird open</Button>
      </div>
   )
}