'use client'

import { useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";

import horizontalLoop from "@/utils/horizontalLoop"

gsap.registerPlugin(Observer);

export default function SponsorsMarquee({ logos }: { logos: string[] }) {
  const container = useRef<HTMLDivElement>(null);

  // Repeat the set until the row overflows the container — otherwise the loop
  // cycles inside a narrow zone and leaves the rest of the width empty.
  const repeats = Math.max(2, Math.ceil(20 / Math.max(logos.length, 1)));
  const loopItems = Array.from({ length: repeats }).flatMap(() => logos);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('.rail img');

    const tl = horizontalLoop(items, {
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
        {loopItems.map((src, i) => (
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