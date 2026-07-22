'use client'

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react";
import { Observer } from "gsap/Observer";

import type { Sponsor } from "@/utils/sponsors"
import horizontalLoop from "@/utils/horizontalLoop"

gsap.registerPlugin(Observer);

const SPEED = 0.4; // idle drift (~40px/s). Lower = slower.

export default function SponsorsMarquee({ sponsors }: { sponsors: Sponsor[] }) {
  const container = useRef<HTMLDivElement>(null);

  // Repeat the set until the row overflows the container — otherwise the loop
  // cycles inside a narrow zone and leaves the rest of the width empty.
  const repeats = Math.max(2, Math.ceil(20 / Math.max(sponsors.length, 1)));
  const loopItems = Array.from({ length: repeats }).flatMap(() => sponsors);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('.rail img');
    // No sponsors → no rail images; skip the marquee so GSAP isn't handed an
    // empty target (which logs "target not found").
    if (items.length === 0) return;

    const tl = horizontalLoop(items, {
      repeat: -1,
      paddingRight: 64,
      speed: SPEED,
    });

    // One second of timeline = this many px of travel, so a drag delta (px)
    // converts to timeline time as delta / pixelsPerSecond.
    const pixelsPerSecond = SPEED * 100;
    const wrapTime = gsap.utils.wrap(0, tl.duration());

    let scrubbing = false;

    // Click-and-drag (desktop) / swipe (mobile) scrubs the rail by hand.
    // Axis lock + touch-action:pan-y leave vertical gestures to the browser,
    // so the page keeps scrolling and page scroll never drives the marquee.
    const observer = Observer.create({
      target: container.current,
      type: "touch,pointer",
      lockAxis: true,
      dragMinimum: 3,
      onDrag: (self) => {
        if (self.axis !== "x") return; // vertical swipe → let the page scroll
        if (!scrubbing) {
          scrubbing = true;
          tl.pause(); // take over from the idle drift while dragging
        }
        // Drag right (deltaX > 0) rewinds the loop so logos follow the cursor.
        tl.time(wrapTime(tl.time() - self.deltaX / pixelsPerSecond));
      },
      onDragEnd: () => {
        if (!scrubbing) return;
        scrubbing = false;
        tl.play(); // hand back to the idle drift
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
          // Plain <img>: sponsor logos are remote (Supabase Storage) URLs, so
          // this avoids configuring next.config images.remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
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
