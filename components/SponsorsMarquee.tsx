'use client'

import { useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";

import horizontalLoop from "@/utils/horizontalLoop"

gsap.registerPlugin(Observer);

// Sponsor logos served from /public/sponsors — add new filenames here as they land.
const LOGOS = [
  "/sponsors/logo.svg", 
  "/sponsors/Group 1.svg",
  "/sponsors/red-bull-logo.svg",
  "/sponsors/thenorthface-logo.svg"
];
// Repeat until the row is wider than the container — otherwise the loop cycles
// inside a narrow zone and leaves the rest of the width empty.
const LOOP_ITEMS = Array.from({ length: 10 }).flatMap(() => LOGOS);

export default function SponsorsMarquee() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const logos = gsap.utils.toArray<HTMLElement>('.rail img');

    const tl = horizontalLoop(logos, {
      repeat: -1,
      paddingRight: 64,
      speed: 0.4, // idle drift (~40px/s). Lower = slower.
    });

    Observer.create({
      onChangeY(self) {
        const direction = self.deltaY < 0 ? -1 : 1;
        gsap.timeline({ defaults: { ease: "power3.out" } })
          // brief, gentle speed-up in the scroll direction…
          .to(tl, { timeScale: direction * 3, duration: 0.4, overwrite: true })
          // …then ease back down to the idle drift speed
          .to(tl, { timeScale: direction, duration: 1.2 }, "+=0.2")
      }
    })
  }, { scope: container })

  return (
    <div
      ref={container}
      className="scrolling-text overflow-hidden w-full flex"
    >
      <div className="rail flex gap-16">
        {LOOP_ITEMS.map((src, i) => (
          <Image
            key={i}
            src={src}
            alt="Sponsor logo"
            width={48}
            height={48}
            className="shrink-0 h-48 w-48"
          />
        ))}
      </div>
    </div>
  );
}
