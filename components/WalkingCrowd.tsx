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

// Walkers are sized by HEIGHT (not width) so every peep stands the same height
// regardless of its viewBox aspect ratio. That height is RESPONSIVE: it ramps
// from MIN (narrow screens) up to MAX (wide screens) — see peepHeight() below.
const PEEP_HEIGHT_MAX = 360; // px — full figure height on wide screens
const PEEP_HEIGHT_MIN = 170; // px — figure height on narrow / phone screens
const WIDTH_FULL = 1280; // container width (px) at/above which peeps are MAX
const WIDTH_FLOOR = 380; // container width (px) at/below which peeps are MIN

const Y_JITTER = 22; // px, +/- vertical wobble per walker
const RTL_CHANCE = 0.4; // fraction of walkers that walk right -> left

// Representative on-screen width, used only for the initial prefill spacing.
// Exact per-peep widths are measured at runtime (see `aspect`) and drive the
// off-screen entry/exit points.
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
  { y: -20,  z: 5,  target: 5, spawn: 800, dur: [8, 40], gap: 0.5 },
  { y: 0,  z: 10, target: 8, spawn: 600, dur: [16, 32], gap: 0.8 },
  { y: 30,  z: 20, target: 10, spawn: 400, dur: [16, 24], gap: 0.4 },
  { y: 80, z: 30, target: 20, spawn: 600, dur: [8, 32], gap: 0.8 },
  { y: 130, z: 40, target: 50, spawn: 50, dur: [5, 32],  gap: 0.3 },
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
      // No `will-change` here: GSAP promotes each element to its own GPU layer
      // while it's tweening (force3D), and walkers tween for their whole life —
      // so a permanent hint on every node would just waste idle GPU memory.
      proto.innerHTML =
        '<div class="walker-move" style="display:inline-block">' +
        '<div class="walker-bob" style="height:80%">' +
        '<img alt="" decoding="async" style="height:100%;width:auto;display:block" />' +
        '</div></div>';

      const intervals: ReturnType<typeof setInterval>[] = [];
      const counts = LAYERS.map(() => 0);
      const active = new Set<gsap.core.Tween>(); // every live tween, for pause/kill

      // Cache the container width so spawns don't force a reflow each time;
      // keep it fresh on resize.
      let containerW = container.clientWidth;
      const ro = new ResizeObserver(() => {
        containerW = container.clientWidth;
      });
      ro.observe(container);

      // Responsive figure height: ramps MIN -> MAX with the container width, so
      // casts shrink on phones and reach full size on wide screens. Read fresh
      // per spawn, so it follows resizes (in-flight walkers keep their size).
      const peepHeight = () =>
        gsap.utils.clamp(
          PEEP_HEIGHT_MIN,
          PEEP_HEIGHT_MAX,
          gsap.utils.mapRange(
            WIDTH_FLOOR,
            WIDTH_FULL,
            PEEP_HEIGHT_MIN,
            PEEP_HEIGHT_MAX,
            containerW
          )
        );

      // Measure each peep's natural aspect ratio once (cached) so entry/exit
      // points match its real width instead of a guess. Also warms the image
      // cache so the walker <img>s paint instantly on first spawn.
      const aspect = new Map<string, number>();
      const FALLBACK_ASPECT = APPROX_PEEP_WIDTH / PEEP_HEIGHT_MAX;
      for (const p of peeps) {
        const probe = new Image();
        probe.onload = () => {
          if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
            aspect.set(p.src, probe.naturalWidth / probe.naturalHeight);
          }
        };
        probe.src = p.src;
      }

      // running = banner is on-screen AND the tab is in the foreground. While
      // false we pause all tweens and stop spawning, so an off-screen banner
      // costs nothing.
      let onScreen = true;
      let running = !reduceMotion;
      const setRunning = (on: boolean) => {
        running = on;
        active.forEach((t) => (on ? t.play() : t.pause()));
      };

      const spawnWalker = (
        layerIdx: number,
        prefillProgress?: number,
        parent: Node = container
      ) => {
        const layer = LAYERS[layerIdx];
        if (counts[layerIdx] >= layer.target) return;
        counts[layerIdx]++;

        const asset = peeps[Math.floor(Math.random() * peeps.length)];
        const direction: 'ltr' | 'rtl' =
          Math.random() > RTL_CHANCE ? 'ltr' : 'rtl';
        const duration = gsap.utils.random(layer.dur[0], layer.dur[1]);
        const ph = peepHeight();
        const ratio = ph / PEEP_HEIGHT_MAX; // scale the vertical layout to match
        const yOffset = (layer.y + gsap.utils.random(-Y_JITTER, Y_JITTER)) * ratio;
        const h = ph * (asset.scale ?? 1);

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
        parent.appendChild(walkerNode);

        // Enter/exit just off-screen by this peep's real width.
        const peepW = h * (aspect.get(asset.src) ?? FALLBACK_ASPECT);
        const fromX = direction === 'ltr' ? -peepW : containerW + peepW;
        const toX = direction === 'ltr' ? containerW + peepW : -peepW;

        // Where the walker starts: mid-path for reduced-motion + prefilled peeps
        // (so the banner loads populated), otherwise just off-screen.
        const startProgress = reduceMotion ? Math.random() : (prefillProgress ?? 0);
        const startX = gsap.utils.interpolate(fromX, toX, startProgress);

        // Single write: face the way we walk + set the start position.
        gsap.set(moveTarget, { scaleX: direction === 'rtl' ? -1 : 1, x: startX });

        // Reduced motion: leave the walker static, no tweens.
        if (reduceMotion) return;

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

      // Prefill each layer so the banner starts already populated. Collect the
      // nodes in a fragment and attach them in one batch (fewer reflows).
      const frag = document.createDocumentFragment();
      const prefillW = APPROX_PEEP_WIDTH * (peepHeight() / PEEP_HEIGHT_MAX);
      LAYERS.forEach((layer, layerIdx) => {
        const step = (prefillW * layer.gap) / (containerW + prefillW * 2);
        for (let i = 0; i < layer.target; i++) {
          const progress = Math.min(0.98, i * step + Math.random() * step * 0.5);
          spawnWalker(layerIdx, progress, frag);
        }
      });
      container.appendChild(frag);

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
        ro.disconnect();
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
      className="relative w-full min-h-75 sm:min-h-100 lg:min-h-125 bg-white overflow-hidden"
    />
  );
}
