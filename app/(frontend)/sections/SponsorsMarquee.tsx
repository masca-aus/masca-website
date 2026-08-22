'use client'

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";

import type { Sponsor } from "@/utils/sponsors"
import horizontalLoop from "@/utils/horizontalLoop"

gsap.registerPlugin(Observer);

const SPEED = 0.4;

export default function SponsorsMarquee({ sponsors }: { sponsors: Sponsor[] }) {
  const container = useRef<HTMLDivElement>(null);

  const repeats = Math.max(2, Math.ceil(20 / Math.max(sponsors.length, 1)));
  const loopItems = Array.from({ length: repeats }).flatMap(() => sponsors);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('.rail img');
    if (items.length === 0) return;

    const tl = horizontalLoop(items, {
      repeat: -1,
      paddingRight: 64,
      speed: SPEED,
    });

    const pixelsPerSecond = SPEED * 100;
    const wrapTime = gsap.utils.wrap(0, tl.duration());

    let scrubbing = false;

    const observer = Observer.create({
      target: container.current,
      type: "touch,pointer",
      lockAxis: true,
      dragMinimum: 3,
      onDrag: (self) => {
        if (self.axis !== "x") return;
        if (!scrubbing) {
          scrubbing = true;
          tl.pause();
        }
        tl.time(wrapTime(tl.time() - self.deltaX / pixelsPerSecond));
      },
      onDragEnd: () => {
        if (!scrubbing) return;
        scrubbing = false;
        tl.play();
      },
    });

    return () => {
      observer.kill();
      tl.kill();
    };
  }, { scope: container })

  return (
    <div
      ref={container}
      className="scrolling-text flex w-full cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
    >
      <div className="rail flex gap-16">
        {loopItems.map((sponsor, i) => (
          <img
            key={i}
            src={sponsor.img}
            alt={sponsor.name || "Sponsor logo"}
            draggable={false}
            className="pointer-events-none shrink-0 h-48 w-48 object-contain"
          />
        ))}
      </div>
    </div>
  );
}
