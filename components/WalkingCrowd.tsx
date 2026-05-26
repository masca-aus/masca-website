'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// One peep. `src` is a public URL (e.g. "/casts/Jin%20Hong.svg"). The list is
// auto-discovered from public/casts/ on the server (see app/layout.tsx) and
// passed in as the `peeps` prop — so dropping a new SVG into that folder joins
// the crowd with no code changes here.
export type Peep = {
  name: string;
  src: string;
  // Optional per-peep nudge if one figure is drawn larger/smaller within its
  // own canvas. 1 = no change. e.g. 0.9 shrinks, 1.1 enlarges.
  scale?: number;
};

// Uniform layer-box height for every walker. Sizing by height (not width) means
// peeps stand the same height regardless of each SVG's viewBox aspect ratio —
// which is what fixes "Pei is bigger than Jin". Width follows naturally.
const PEEP_HEIGHT = 360; // px (the figure renders in the upper 80%, see below)

const Y_JITTER = 22; // px, +/- vertical wobble per walker
const RTL_CHANCE = 0.4; // fraction of walkers that walk right -> left

// Approx on-screen width a walker occupies, for overlap spacing math. Since we
// size by height, exact widths vary per peep; this is a good-enough average for
// prefill spacing and the off-screen enter/exit points.
const APPROX_PEEP_WIDTH = 300;

// ── Depth layers, back -> front ─────────────────────────────────────────
// Depth comes from the vertical band each row sits in (`y`) plus z-index.
//
// y      : base vertical offset (more negative = higher = further back)
// z      : stacking order (front covers back)
// target : concurrent walkers (density)
// spawn  : ms between spawns (lower = refills faster)
// dur    : [min,max] seconds to cross (lower = faster)
// gap    : spacing between walkers when prefilled, in peep-widths (<1 overlaps)
type Layer = {
  y: number;
  z: number;
  target: number;
  spawn: number;
  dur: [number, number];
  gap: number;
};

const LAYERS: Layer[] = [
  { y: -10,  z: 5,  target: 3, spawn: 500, dur: [26, 36], gap: 0.5 },
  { y: 30,  z: 10, target: 8, spawn: 600, dur: [22, 32], gap: 0.8 },
  { y: 70,  z: 20, target: 15, spawn: 400, dur: [16, 24], gap: 0.4 },
  { y: 100, z: 30, target: 8, spawn: 600, dur: [22, 32], gap: 0.8 },
  { y: 150, z: 40, target: 30, spawn: 300, dur: [8, 14],  gap: 0.3 },
];

export default function WalkingCrowd({ peeps }: { peeps: Peep[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container || peeps.length === 0) return;

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      // Build the walker DOM ONCE; clone it per spawn instead of re-parsing an
      // innerHTML string every time. Two nested layers carry the two independent
      // transforms: .walker-move (horizontal travel + facing), .walker-bob (the
      // bounce). The figure occupies the upper 80% of the box; the lower 20% is
      // ground spacing beneath the feet.
      const proto = document.createElement('div');
      proto.className = 'absolute bottom-0 left-0 pointer-events-none';
      proto.innerHTML =
        '<div class="walker-move" style="display:inline-block;will-change:transform">' +
        '<div class="walker-bob" style="height:80%;will-change:transform">' +
        '<img alt="" decoding="async" style="height:100%;width:auto;display:block" />' +
        '</div></div>';

      const intervals: ReturnType<typeof setInterval>[] = [];
      const counts = LAYERS.map(() => 0);
      const active = new Set<gsap.core.Tween>(); // every live tween, for pause/kill

      // running = banner is on-screen AND the tab is in the foreground. While
      // false we pause all tweens and stop spawning, so an off-screen banner
      // costs nothing.
      let onScreen = true;
      let running = !reduceMotion;
      const setRunning = (on: boolean) => {
        running = on;
        active.forEach((t) => (on ? t.play() : t.pause()));
      };

      const spawnWalker = (layerIdx: number, prefillProgress?: number) => {
        const layer = LAYERS[layerIdx];
        if (counts[layerIdx] >= layer.target) return;
        counts[layerIdx]++;

        const asset = peeps[Math.floor(Math.random() * peeps.length)];
        const direction: 'ltr' | 'rtl' =
          Math.random() > RTL_CHANCE ? 'ltr' : 'rtl';
        const duration = gsap.utils.random(layer.dur[0], layer.dur[1]);
        const yOffset = layer.y + gsap.utils.random(-Y_JITTER, Y_JITTER);
        const h = PEEP_HEIGHT * (asset.scale ?? 1);

        const walkerNode = proto.cloneNode(true) as HTMLDivElement;
        walkerNode.style.zIndex = String(layer.z);
        walkerNode.style.transform = `translateY(${yOffset}px)`;

        const moveTarget = walkerNode.querySelector(
          '.walker-move'
        ) as HTMLElement;
        const bobTarget = walkerNode.querySelector('.walker-bob') as HTMLElement;
        const img = walkerNode.querySelector('img') as HTMLImageElement;
        moveTarget.style.height = `${h}px`;
        img.src = asset.src;
        container.appendChild(walkerNode);

        const containerW = container.clientWidth;
        const offLeft = -APPROX_PEEP_WIDTH;
        const offRight = containerW + APPROX_PEEP_WIDTH;
        const fromX = direction === 'ltr' ? offLeft : offRight;
        const toX = direction === 'ltr' ? offRight : offLeft;

        // Face the way we walk, and start off-screen on the entry side.
        gsap.set(moveTarget, { scaleX: direction === 'rtl' ? -1 : 1, x: fromX });

        // Reduced motion: drop a static walker somewhere along its path; no tweens.
        if (reduceMotion) {
          gsap.set(moveTarget, {
            x: gsap.utils.interpolate(fromX, toX, Math.random()),
          });
          return;
        }

        // Prefilled walkers start partway across so the banner loads populated.
        if (prefillProgress != null) {
          gsap.set(moveTarget, {
            x: gsap.utils.interpolate(fromX, toX, prefillProgress),
          });
        }
        const remaining = prefillProgress != null ? 1 - prefillProgress : 1;

        const bob = gsap.to(bobTarget, {
          y: -10,
          rotation: gsap.utils.random(-2, 2),
          duration: gsap.utils.random(0.28, 0.4),
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut',
          transformOrigin: 'bottom center',
        });
        const move = gsap.to(moveTarget, {
          x: toX,
          duration: duration * remaining,
          ease: 'none',
          onComplete: () => {
            // Kill BOTH tweens — otherwise the infinite bob keeps ticking on a
            // detached node forever (the original leak).
            bob.kill();
            active.delete(bob);
            active.delete(move);
            walkerNode.remove();
            counts[layerIdx]--;
          },
        });
        active.add(bob);
        active.add(move);
      };

      // Prefill each layer so the banner starts already populated.
      LAYERS.forEach((layer, layerIdx) => {
        const containerW = container.clientWidth;
        const step =
          (APPROX_PEEP_WIDTH * layer.gap) / (containerW + APPROX_PEEP_WIDTH * 2);
        for (let i = 0; i < layer.target; i++) {
          const progress = Math.min(0.98, i * step + Math.random() * step * 0.5);
          spawnWalker(layerIdx, progress);
        }
      });

      if (reduceMotion) return;

      // Ongoing respawn — gated by `running` so nothing spawns while paused.
      LAYERS.forEach((_, layerIdx) => {
        const id = setInterval(() => {
          if (running) spawnWalker(layerIdx);
        }, LAYERS[layerIdx].spawn);
        intervals.push(id);
      });

      // Pause tweens AND spawning when off-screen or the tab is hidden.
      const sync = () => setRunning(onScreen && !document.hidden);
      const io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          sync();
        },
        { threshold: 0 }
      );
      io.observe(container);
      document.addEventListener('visibilitychange', sync);

      return () => {
        intervals.forEach(clearInterval);
        io.disconnect();
        document.removeEventListener('visibilitychange', sync);
        active.forEach((t) => t.kill()); // kill any in-flight tweens on unmount
        active.clear();
      };
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative w-full h-[500px] bg-[#FFFEF8] overflow-hidden"
    />
  );
}
