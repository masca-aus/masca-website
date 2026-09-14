'use client'

import Image from "next/image";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useEffect, useRef, useState, type Ref } from "react";

import Button from "./Button";

const navLinks = [
  // { name: "Home", href: "/"},
  { name: "About", href: "/about"},
  { name: "Events", href: "/events"},
  // { name: "Welfare", href: "/welfare"},
  { name: "Careers", href: "/careers"},
  // { name: "Unite", href: "/unite"},
  { name: "Committee", href: "/committee"},
]

type IsActive = (href: string) => boolean

// Brand logo + wordmark, links home.
function Logo() {
  return (
    <Link href="/" className="col-1 justify-self-start relative z-20">
      <div className="flex items-center gap-4">
        <Image src="/logo/logo.png" alt="Masca logo" width={36} height={40} priority sizes="40px" className="h-10 w-auto" />
        <div className="flex flex-col leading-none">
          <span className="text-xl font-bold tracking-wider text-blue-600">MASCA</span>
          <span className="text-xs font-semibold text-gray-700/80 uppercase">malaysian students&apos; council</span>
        </div>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Satay toggle icon geometry (40x40 viewBox).
//
// Cold: three skewers stacked as a hamburger, all brand blue. Each is a bamboo
// stick (blunt handle on the left, tapering to a point on the right) threaded
// with five uneven chunks of meat. Open: the outer two fade out and the middle
// one drops onto a grill — the stick turns bamboo-tan, the meat sears red then
// browns, a sheen appears, and char marks darken the longer it cooks.
// Module scope keeps these static — defined once, not per render.
// ---------------------------------------------------------------------------

const SKEWERS = [
  { id: "skewer-top", cy: 9 },
  { id: "skewer-mid", cy: 18 },
  { id: "skewer-bot", cy: 27 },
] as const

// Palette for the cooking state. Cold is always the brand blue.
const COLD = "#010066"
const COLD_DIM = "#34389A"       // blue lightening as heat leaves
const SEAR = "#8f2b16"           // raw meat hitting the grill
const COOKED = "#b5652c"         // browned satay
const BAMBOO = "#d9b77c"

// Bamboo stick: blunt rounded handle at the left, tapering to a point.
function stickPath(cy: number) {
  return `M 3 ${cy - 1} L 31 ${cy - 0.75} L 37.5 ${cy} L 31 ${cy + 0.75} L 3 ${cy + 1} Q 2.2 ${cy} 3 ${cy - 1} Z`
}

// Scorched tip of the stick, only visible once it's been over the fire.
function tipPath(cy: number) {
  return `M 31 ${cy - 0.75} L 37.5 ${cy} L 31 ${cy + 0.75} Z`
}

// Meat chunks: centre x, width, height, tilt (deg), shape variant. Sizes and
// tilts are deliberately uneven so no two pieces look the same.
const MEAT = [
  { cx: 7.6,  w: 5.2, h: 5.8, tilt: -7, v: 0 },
  { cx: 12.9, w: 4.6, h: 5.2, tilt: 5,  v: 1 },
  { cx: 18.3, w: 5.6, h: 6.0, tilt: -4, v: 2 },
  { cx: 23.6, w: 4.8, h: 5.4, tilt: 8,  v: 3 },
  { cx: 28.6, w: 4.2, h: 4.8, tilt: -6, v: 1 },
] as const

// Four lumpy blob outlines — each a closed loop of four quadratic curves with
// the control points nudged differently so the chunks read as hand-cut meat.
function meatPath(cx: number, cy: number, w: number, h: number, v: number) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2
  switch (v) {
    case 0:
      return `M ${l + 1.2} ${t + 0.4} Q ${cx - 0.4} ${t - 0.7} ${r - 0.9} ${t + 0.6} Q ${r + 0.6} ${cy - 0.6} ${r - 0.2} ${b - 1.1} Q ${cx + 0.6} ${b + 0.6} ${l + 0.6} ${b - 0.3} Q ${l - 0.7} ${cy + 0.3} ${l + 1.2} ${t + 0.4} Z`
    case 1:
      return `M ${l + 0.6} ${t + 0.9} Q ${cx - 0.8} ${t - 0.5} ${r - 1.3} ${t + 0.2} Q ${r + 0.7} ${cy - 0.9} ${r - 0.5} ${b - 0.6} Q ${cx} ${b + 0.7} ${l + 1.1} ${b - 0.8} Q ${l - 0.5} ${cy + 0.6} ${l + 0.6} ${t + 0.9} Z`
    case 2:
      return `M ${l + 0.9} ${t + 0.2} Q ${cx + 0.2} ${t - 0.8} ${r - 0.4} ${t + 1.0} Q ${r + 0.5} ${cy + 0.2} ${r - 1.0} ${b - 0.4} Q ${cx - 0.3} ${b + 0.6} ${l + 0.4} ${b - 1.0} Q ${l - 0.6} ${cy - 0.4} ${l + 0.9} ${t + 0.2} Z`
    default:
      return `M ${l + 1.4} ${t + 0.6} Q ${cx} ${t - 0.6} ${r - 0.6} ${t + 0.8} Q ${r + 0.4} ${cy} ${r - 0.9} ${b - 0.3} Q ${cx - 0.5} ${b + 0.5} ${l + 0.5} ${b - 0.5} Q ${l - 0.4} ${cy - 0.5} ${l + 1.4} ${t + 0.6} Z`
  }
}

// Char-mark placement per variant: [dx, dy, rx, ry] of the main streak; the
// second streak is a smaller one mirrored across the chunk's centre.
const CHAR = [
  [-0.9, -1.0, 1.2, 0.5],
  [0.9, 1.0, 1.0, 0.45],
  [0.6, -1.3, 0.9, 0.4],
  [-1.1, 0.7, 1.1, 0.45],
] as const

// Flames, back to front: outer orange, inner yellow, pale core.
const OUTER_FLAMES = [
  { cx: 8.5, h: 11, w: 6, fill: "#ea580c" },
  { cx: 14, h: 14, w: 7, fill: "#f97316" },
  { cx: 20, h: 12, w: 6.5, fill: "#f97316" },
  { cx: 25.5, h: 10, w: 5.5, fill: "#ea580c" },
] as const

const INNER_FLAMES = [
  { cx: 14, h: 9, w: 4 },
  { cx: 20, h: 7.5, w: 3.6 },
] as const

const CORE_FLAMES = [
  { cx: 14, h: 5, w: 2.2 },
  { cx: 20, h: 4.2, w: 2 },
] as const

// A teardrop flame: rounded base at baseY, point h above it.
function flamePath(cx: number, baseY: number, h: number, w: number) {
  const half = w / 2
  return `M ${cx - half} ${baseY} C ${cx - half - 1} ${baseY - h * 0.45}, ${cx - 1.3} ${baseY - h * 0.8}, ${cx} ${baseY - h} C ${cx + 1.3} ${baseY - h * 0.8}, ${cx + half + 1} ${baseY - h * 0.45}, ${cx + half} ${baseY} Q ${cx} ${baseY + 1.4} ${cx - half} ${baseY} Z`
}

// One satay skewer: stick, scorched tip, and five chunks each carrying its
// own char marks and sheen (hidden until cooking).
function Skewer({ id, cy }: { id: string; cy: number }) {
  return (
    <g id={id}>
      <path className="stick" d={stickPath(cy)} fill={COLD} />
      <path className="tip" d={tipPath(cy)} fill="#8a6a3c" style={{ opacity: 0 }} />
      {MEAT.map(({ cx, w, h, tilt, v }, i) => {
        const [dx, dy, rx, ry] = CHAR[v]
        return (
          <g key={i} transform={`rotate(${tilt} ${cx} ${cy})`}>
            <path className="meat" d={meatPath(cx, cy, w, h, v)} fill={COLD} />
            <ellipse className="char" cx={cx + dx} cy={cy + dy} rx={rx} ry={ry} fill="#3b1a0b" style={{ opacity: 0 }} />
            <ellipse className="char" cx={cx - dx * 0.7} cy={cy - dy * 0.9} rx={rx * 0.65} ry={ry * 0.7} fill="#3b1a0b" style={{ opacity: 0 }} />
            <ellipse className="sheen" cx={cx - w * 0.18} cy={cy - h * 0.22} rx={w * 0.22} ry={h * 0.14} fill="#fde9c4" style={{ opacity: 0 }} />
          </g>
        )
      })}
    </g>
  )
}

// Presentational satay SVG. The ref (React 19 ref-as-prop) lets SatayToggle
// drive GSAP animations against the inner groups and classes.
function SatayIcon({ ref }: { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} viewBox="0 0 40 40" className="w-11 h-11 overflow-visible" aria-hidden="true">
      {/* ember glow + flames (painted behind the skewer) */}
      <g id="fire">
        <ellipse className="glow" cx="17" cy="33" rx="13" ry="4" fill="#f97316" style={{ opacity: 0 }} />
        {OUTER_FLAMES.map((f, i) => (
          <path key={`of-${i}`} className="flame" d={flamePath(f.cx, 33, f.h, f.w)} fill={f.fill} style={{ opacity: 0 }} />
        ))}
        {INNER_FLAMES.map((f, i) => (
          <path key={`if-${i}`} className="flame" d={flamePath(f.cx, 32, f.h, f.w)} fill="#facc15" style={{ opacity: 0 }} />
        ))}
        {CORE_FLAMES.map((f, i) => (
          <path key={`cf-${i}`} className="flame" d={flamePath(f.cx, 31.5, f.h, f.w)} fill="#fef3c7" style={{ opacity: 0 }} />
        ))}
      </g>

      {/* skewers */}
      <g id="skewers">
        {SKEWERS.map(({ id, cy }) => <Skewer key={id} id={id} cy={cy} />)}
      </g>

      {/* charcoal grill (in front of the flames' base so they rise out of it) */}
      <g id="grill" style={{ opacity: 0 }}>
        <rect x="2" y="33.2" width="30" height="1.1" rx="0.55" fill="#3f3f46" />
        <rect x="2.5" y="34.6" width="29" height="1.4" fill="#1c1917" opacity="0.7" />
        <rect x="2" y="36.4" width="30" height="1.1" rx="0.55" fill="#3f3f46" />
      </g>

      {/* smoke puff (close hint) */}
      <g id="smoke">
        <ellipse className="smoke" cx="12" cy="14" rx="3" ry="2.2" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
        <ellipse className="smoke" cx="18" cy="12" rx="2.6" ry="1.9" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
        <ellipse className="smoke" cx="24" cy="13" rx="2.2" ry="1.6" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
      </g>

      {/* thin wisps that rise continuously while the satay cooks */}
      <g id="cook-smoke">
        <circle className="cook-smoke" cx="13" cy="15" r="2.2" fill="#4A4A4A" style={{ opacity: 0 }} />
        <circle className="cook-smoke" cx="19" cy="14.5" r="1.9" fill="#4A4A4A" style={{ opacity: 0 }} />
        <circle className="cook-smoke" cx="24" cy="15" r="1.6" fill="#4A4A4A" style={{ opacity: 0 }} />
      </g>
    </svg>
  )
}

// Mobile menu button: the animated satay-on-the-grill toggle. Owns the icon's
// refs and the GSAP timelines that morph it between cold and cooking states.
function SatayToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const flickerRef = useRef<gsap.core.Timeline | null>(null)
  const smokeRef = useRef<gsap.core.Tween | null>(null)
  const charRef = useRef<gsap.core.Tween | null>(null)

  // Build the looping flame-flicker + cooking-smoke + slow-char tweens once;
  // they stay paused until the menu opens, then run for that "live grill" feel
  // (flames flickering, smoke rising, the meat gradually charring).
  useGSAP(() => {
    const flames = gsap.utils.toArray<SVGElement>(".flame", svgRef.current)
    gsap.set(flames, { transformOrigin: "center bottom", scaleY: 0, opacity: 0 })
    gsap.set(".smoke", { transformOrigin: "center center", opacity: 0, y: 0, scale: 0.6 })
    gsap.set(".cook-smoke", { transformOrigin: "center center", opacity: 0, y: 0, scale: 0.6 })

    flickerRef.current = gsap
      .timeline({ repeat: -1, yoyo: true, paused: true, repeatRefresh: true, defaults: { ease: "sine.inOut" } })
      .to(flames, {
        scaleY: () => gsap.utils.random(0.78, 1),
        scaleX: () => gsap.utils.random(0.9, 1.08),
        x: () => gsap.utils.random(-0.5, 0.5),
        opacity: () => gsap.utils.random(0.85, 1),
        duration: () => gsap.utils.random(0.16, 0.3),
        stagger: { each: 0.05, from: "random" },
      }, 0)
      // the ember bed breathes with the flames
      .to(".glow", { opacity: () => gsap.utils.random(0.18, 0.34), duration: () => gsap.utils.random(0.2, 0.35) }, 0)

    // Wisps rise off the skewer, fading in then out, staggered into a steady
    // stream that loops for as long as the satay is cooking.
    smokeRef.current = gsap.to(".cook-smoke", {
      keyframes: {
        "0%": { y: 0, opacity: 0, scale: 0.6 },
        "20%": { opacity: 0.7 },
        "70%": { opacity: 0.5 },
        "100%": { y: -18, opacity: 0, scale: 1.6 },
      },
      duration: 1.8,
      ease: "sine.out",
      repeat: -1,
      stagger: { each: 0.45 },
      paused: true,
    })

    // Char marks creep in over a few seconds — the longer the menu is open,
    // the more the satay has cooked.
    charRef.current = gsap.to("#skewer-mid .char", {
      opacity: 0.65,
      duration: 2.4,
      ease: "power1.in",
      stagger: { each: 0.18, from: "random" },
      paused: true,
    })
  }, { scope: svgRef })

  // Morph the icon when the menu toggles: the outer skewers fade as the middle
  // one drops onto the grill, sears, and browns; on close the flames go out
  // with a smoke puff, the colour drains back to blue, and the three split
  // back apart.
  useGSAP(() => {
    if (!svgRef.current) return
    const flames = gsap.utils.toArray<SVGElement>(".flame", svgRef.current)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tl = gsap.timeline({ defaults: { ease: "entranceEase" } })

    if (open) {
      tl.to("#skewer-top", { y: 9, opacity: 0, duration: 0.4 }, 0)
        .to("#skewer-bot", { y: -9, opacity: 0, duration: 0.4 }, 0)
        .to("#skewer-mid", { y: 3, scale: 1.06, rotation: 14, transformOrigin: "center center", duration: 0.45 }, 0)
        // stick goes bamboo; meat sears red first, then browns
        .to("#skewer-mid .stick", { fill: BAMBOO, duration: 0.45 }, 0.1)
        .to("#skewer-mid .meat", { fill: SEAR, duration: 0.2 }, 0)
        .to("#skewer-mid .meat", { fill: COOKED, duration: 0.5 }, 0.3)
        .to("#skewer-mid .tip", { opacity: 1, duration: 0.4 }, 0.4)
        .to("#skewer-mid .sheen", { opacity: 0.5, duration: 0.4, stagger: 0.04 }, 0.5)
        .to("#grill", { opacity: 1, duration: 0.3 }, 0.1)
        .to(".glow", { opacity: 0.28, duration: 0.3 }, 0.15)
        .to(flames, { opacity: 1, scaleY: 1, scaleX: 1, duration: 0.35, stagger: { each: 0.05, from: "center" } }, 0.18)
      if (reduced) {
        tl.set("#skewer-mid .char", { opacity: 0.65 }, 0.6)
      } else {
        tl.call(() => { flickerRef.current?.play(0); smokeRef.current?.play(0); charRef.current?.play(0) }, undefined, 0.55)
      }
    } else {
      // Only run the close sequence if we were actually cooking — keeps the
      // initial mount (and StrictMode double-invoke) from flashing smoke.
      const lit = flames.length > 0 && (gsap.getProperty(flames[0], "scaleY") as number) > 0.05
      if (!lit) return
      flickerRef.current?.pause()
      smokeRef.current?.pause()
      charRef.current?.pause()
      tl.set(".cook-smoke", { opacity: 0, y: 0, scale: 0.6 }, 0)
        .to(flames, { scaleY: 0, opacity: 0, duration: 0.28, stagger: { each: 0.03, from: "edges" } }, 0)
        .to(".glow", { opacity: 0, duration: 0.3 }, 0)
        .to("#grill", { opacity: 0, duration: 0.35 }, 0.1)
        .fromTo(".smoke",
          { opacity: 0, y: 0, scale: 0.5 },
          { opacity: 0.9, y: -15, scale: 1.8, duration: 0.75, stagger: 0.12, ease: "power1.out" }, 0.05)
        .to(".smoke", { opacity: 0, duration: 0.45 }, 0.65)
        // heat drains: brown → dim blue → brand blue
        .to("#skewer-mid .char", { opacity: 0, duration: 0.25 }, 0)
        .to("#skewer-mid .sheen", { opacity: 0, duration: 0.2 }, 0)
        .to("#skewer-mid .tip", { opacity: 0, duration: 0.3 }, 0)
        .to("#skewer-mid .meat", { fill: COLD_DIM, duration: 0.2 }, 0)
        .to("#skewer-mid .stick", { fill: COLD_DIM, duration: 0.2 }, 0)
        .to(["#skewer-mid .meat", "#skewer-mid .stick"], { fill: COLD, duration: 0.4 }, 0.28)
        .to("#skewer-top", { y: 0, opacity: 1, duration: 0.4 }, 0.25)
        .to("#skewer-bot", { y: 0, opacity: 1, duration: 0.4 }, 0.25)
        .to("#skewer-mid", { y: 0, scale: 1, rotation: 0, duration: 0.4 }, 0.25)
    }
  }, { dependencies: [open], scope: svgRef })

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="col-3 justify-self-end lg:hidden p-2 -mr-2 relative z-20"
    >
      <SatayIcon ref={svgRef} />
    </button>
  )
}

// Centered primary navigation (desktop only).
function DesktopNav({ isActive }: { isActive: IsActive }) {
  return (
    <nav className="col-2 justify-self-center hidden lg:flex gap-6">
      {navLinks.map((link) => {
        const active = isActive(link.href)
        return (
          <Button
            key={link.name} href={link.href} variant="ghost"
            className={active ? "text-red-600 border-b-3 border-b-red-600" : "text-blue-600 border-0"}
          >
            {link.name}
          </Button>
        )
      })}
    </nav>
  )
}

// Auth / membership actions (desktop only).
function DesktopActions() {
  return (
    <div className="col-3 justify-self-end hidden lg:inline-flex gap-6">
      <Button href="/contact" variant="accent">
        Get in touch
      </Button>
    </div>
  )
}

// Full-screen mobile dropdown. Owns the panel ref and its open/close animation.
function MobileMenu({ open, isActive, pathname }: { open: boolean; isActive: IsActive, pathname: string }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!panelRef.current) return
    gsap.to(panelRef.current, {
      height: open ? window.innerHeight : 0,
      opacity: open ? 1 : 0,
      duration: 0.4,
      ease: "entranceEase",
    })
  }, { dependencies: [open] })

  return (
    <div
      id="mobile-menu"
      ref={panelRef}
      className="fixed inset-x-0 top-0 z-10 lg:hidden overflow-hidden bg-white/95 backdrop-blur-md"
      style={{ height: 0, opacity: 0 }}
    >
      <nav key={ pathname } className="flex flex-col items-center justify-center gap-6 h-dvh px-6 text-center">
        {navLinks.map((link) => {
          const active = isActive(link.href)
          return (
            <Button
              key={link.name} href={link.href} variant="ghost"
              className={`text-3xl! ${active ? "text-red-600" : "text-blue-600"}`}
            >
              {link.name}
            </Button>
          )
        })}
        <Button href="/contact" variant="accent" className="text-xl! px-8 py-4 mt-2">
          Contact us
        </Button>
      </nav>
    </div>
  )
}

// Stateful container: owns the open state + global side effects, and assembles
// the navbar from the focused pieces above.
export default function NavBar() {
  const headerRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive: IsActive = (href) => href === "/" ? pathname === "/" : pathname.startsWith(href)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  // Close the mobile menu on Escape.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Lock background scroll while the full-screen menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Frost the header background once the page scrolls past the hero.
  useGSAP(() => {
    gsap.to(headerRef.current, {
      backgroundColor: 'rgba(255,255,255,0.8)',
      // GSAP auto-applies the -webkit- prefix; setting WebkitBackdropFilter
      // explicitly trips its "unknown property" warning, so only set the
      // standard one (broadly supported in current browsers).
      backdropFilter: 'blur(10px)',
      ease: 'entranceEase',
      scrollTrigger: {
        start: 80,
        end: 80,
        toggleActions: 'play none none reverse',
      },
    })
  }, { scope: headerRef })

  // Hide on scroll-down, reveal on scroll-up — mobile only (below the lg
  // breakpoint, where the satay menu replaces the desktop nav). A paused tween
  // parked at its end (yPercent: 0, fully shown) is driven by a full-page
  // ScrollTrigger that reads scroll direction: down (1) reverses it up out of
  // view, up (-1) plays it back. Near the top it's always shown so the page
  // never opens hidden. matchMedia tears it all down (and resets the header)
  // when the viewport crosses into desktop, so the bar stays put there.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      const showAnim = gsap.from(headerRef.current, {
        yPercent: -100,
        paused: true,
        duration: 0.3,
        ease: "entranceEase",
      }).progress(1)

      const st = ScrollTrigger.create({
        start: "top top",
        end: "max",
        onUpdate: (self) => {
          if (self.scroll() < 80 || self.direction === -1) showAnim.play()
          else showAnim.reverse()
        },
      })

      return () => {
        st.kill()
        showAnim.kill()
        gsap.set(headerRef.current, { clearProps: "transform" })
      }
    })
  }, { scope: headerRef })

  return (
    <header ref={headerRef} className="fixed top-0 left-0 w-full z-50 grid grid-cols-[auto_auto_auto] items-center py-2 md:py-4 px-6 md:px-16 bg-white backface-hidden will-change-[transform,backdrop-filter]">
      <Logo />
      <SatayToggle open={open} onToggle={() => setOpen((v) => !v)} />
      <DesktopNav isActive={isActive} />
      <DesktopActions />
      <MobileMenu open={open} isActive={isActive} pathname={pathname} />
    </header>
  )
}