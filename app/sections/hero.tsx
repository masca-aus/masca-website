'use client'

import { useRef } from "react";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

import { InAustralia }  from "@/components/TextSVG";
import Button from "@/components/Button";
import { writeInOnScroll } from "@/utils/animation"


export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    writeInOnScroll(".stroke", sectionRef.current)
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bg-blue-600">
      <div
      className="
          container grid gap-16 min-h-screen
          grid-cols-1 grid-rows-[1fr_auto_2fr] [grid-template-areas:'.'_'main'_'stats']
          md:grid-cols-2 md:grid-rows-[1fr_auto_2fr] md:[grid-template-areas:'._.'_'main_event'_'stats_.']
      "
      >
        <div className="[grid-area:main]">
            <MainContent />
        </div>

        <div className="[grid-area:stats]">
            <Statistic />
        </div>

        <div className="hidden md:inline-flex md:[grid-area:event] md:justify-self-center md:self-center">
            <UpcomingEvent />
        </div>
      </div>
    </section>
  );
}

function MainContent() {
  return (
    <header className="flex flex-col gap-6 justify-center">
      <span className="eyebrow text-yellow-500">
        founded 2001 &middot; 6 states &middot; 1 territory
      </span>
      <h1 className="text-white text-5xl md:text-6xl lg:text-7xl">
        A home for <br /> Malaysians <br /> studying <InAustralia />
      </h1>
      <p className="text-gray-300">
        MASCA is the peak student representative body for Malaysians across
        Australia — built by students, for students. Selamat datang, and welcome
        home.
      </p>
      <div className="flex gap-4">
        <Button href="/sign-up" variant="accent">
          Become a Member <span>&rarr;</span>
        </Button>
        <Button href="/events" variant="outline" className="text-white border-gray-300">
          See Whats On
        </Button>
      </div>
    </header>
  );
}

function Statistic() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const counters = gsap.utils.toArray<HTMLElement>(".stat-value");

      counters.forEach((el) => {
        const target = Number(el.dataset.value);
        const suffix = el.dataset.suffix ?? "";
        const proxy = { val: 0 };

        // Reset to the start value before the first tick to avoid a flash of the final number.
        el.textContent = `0${suffix}`;

        gsap.to(proxy, {
          val: target,
          duration: 2,
          ease: "entranceEase",
          onUpdate: () => {
            el.textContent = `${Math.round(proxy.val)}${suffix}`;
          },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="flex gap-4 border-t pt-8 border-blue-100/20">
      <div className="flex flex-col">
        <span
          className="stat-value text-h2 font-bold text-yellow-500"
          data-value="20"
          data-suffix="k+"
        >
          20k+
        </span>
        <span className="eyebrow text-gray-300">students reached</span>
      </div>
      <div className="flex flex-col">
        <span
          className="stat-value text-h2 font-bold text-yellow-500"
          data-value="7"
        >
          7
        </span>
        <span className="eyebrow text-gray-300">state chapters</span>
      </div>
      <div className="flex flex-col">
        <span
          className="stat-value text-h2 font-bold text-yellow-500"
          data-value="2001"
        >
          2001
        </span>
        <span className="eyebrow text-gray-300">founded</span>
      </div>
    </div>
  );
}

function UpcomingEvent() {
  return (
    <div className="flex flex-col gap-4 items-start border border-blue-100/20 rounded-lg bg-blue-500 mx-8 p-8">
      <span className="eyebrow text-yellow-500">Next Major Event</span>
      <span className="text-white text-xl font-bold">
        MASCA National Convention 2026
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-caption text-gray-300">Melbourne 3-5 July 2026</span>
        <span className="text-caption text-gray-300">Hosted by MASCA National</span>
      </div>
      <Button variant="secondary" className="py-1">
        Early bird open
      </Button>
    </div>
  );
}