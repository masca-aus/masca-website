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
  { name: "Home", href: "/"},
  { name: "Events", href: "/events"},
  { name: "Welfare", href: "/care"},
  { name: "About", href: "/about"},
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

// Satay toggle icon geometry (40x40 viewBox). Three skewers stacked when
// closed; they converge into one cooking skewer with flames when the menu
// opens. Module scope keeps these static — defined once, not per render.
const SKEWERS = [
  { id: "skewer-top", cy: 9 },
  { id: "skewer-mid", cy: 18 },
  { id: "skewer-bot", cy: 27 },
] as const

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

// A teardrop flame: rounded base at baseY, point h above it.
function flamePath(cx: number, baseY: number, h: number, w: number) {
  const half = w / 2
  return `M ${cx - half} ${baseY} C ${cx - half - 1} ${baseY - h * 0.45}, ${cx - 1.3} ${baseY - h * 0.8}, ${cx} ${baseY - h} C ${cx + 1.3} ${baseY - h * 0.8}, ${cx + half + 1} ${baseY - h * 0.45}, ${cx + half} ${baseY} Q ${cx} ${baseY + 1.4} ${cx - half} ${baseY} Z`
}

// Presentational satay SVG. The ref (React 19 ref-as-prop) lets SatayToggle
// drive GSAP animations against the inner #skewers / .flame / .smoke groups.
function SatayIcon({ ref }: { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} viewBox="0 0 40 40" className="w-11 h-11 overflow-visible" aria-hidden="true">
      {/* flames (painted behind the skewer) */}
      <g id="flames">
        {OUTER_FLAMES.map((f, i) => (
          <path key={`of-${i}`} className="flame" d={flamePath(f.cx, 33, f.h, f.w)} fill={f.fill} style={{ opacity: 0 }} />
        ))}
        {INNER_FLAMES.map((f, i) => (
          <path key={`if-${i}`} className="flame" d={flamePath(f.cx, 32, f.h, f.w)} fill="#facc15" style={{ opacity: 0 }} />
        ))}
      </g>

      {/* skewers (cold = brand blue; children inherit the group fill) */}
      <g id="skewers" fill="#010066">
        {SKEWERS.map(({ id, cy }) => (
          <g id={id} key={id}>
            <rect x="5" y={cy - 0.8} width="31" height="1.6" rx="0.8" />
            <rect x="5.5" y={cy - 2.5} width="4.6" height="5" rx="0.7" />
            <rect x="10.6" y={cy - 2.5} width="4.6" height="5" rx="0.7" />
            <rect x="15.7" y={cy - 2.5} width="4.6" height="5" rx="0.7" />
            <rect x="20.8" y={cy - 2.5} width="4.6" height="5" rx="0.7" />
          </g>
        ))}
      </g>

      {/* smoke puff (close hint) */}
      <g id="smoke">
        <ellipse className="smoke" cx="12" cy="14" rx="3" ry="2.2" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
        <ellipse className="smoke" cx="18" cy="12" rx="2.6" ry="1.9" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
        <ellipse className="smoke" cx="24" cy="13" rx="2.2" ry="1.6" fill="#4A4A4A" stroke="#4A4A4A" style={{ opacity: 0 }} />
      </g>

      {/* thin wisps that rise continuously while the satay cooks */}
      <g id="cook-smoke">
        <circle className="cook-smoke" cx="13" cy="13" r="2.2" fill="#4A4A4A" style={{ opacity: 0 }} />
        <circle className="cook-smoke" cx="19" cy="12.5" r="1.9" fill="#4A4A4A" style={{ opacity: 0 }} />
        <circle className="cook-smoke" cx="24" cy="13" r="1.6" fill="#4A4A4A" style={{ opacity: 0 }} />
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

  // Build the looping flame-flicker + cooking-smoke timelines once; they stay
  // paused until the menu opens, then play continuously for that "live grill"
  // feel (flames flickering, a thin wisp of smoke rising off the satay).
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
      })

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
  }, { scope: svgRef })

  // Morph the icon when the menu toggles: the three cold skewers converge into
  // one skewer cooking over flames on open; on close the flames go out with a
  // smoke puff + dim-to-grey before the skewers split back into three.
  useGSAP(() => {
    if (!svgRef.current) return
    const flames = gsap.utils.toArray<SVGElement>(".flame", svgRef.current)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tl = gsap.timeline({ defaults: { ease: "entranceEase" } })

    if (open) {
      tl.to("#skewer-top", { y: 9, opacity: 0, duration: 0.4 }, 0)
        .to("#skewer-bot", { y: -9, opacity: 0, duration: 0.4 }, 0)
        .to("#skewer-mid", { y: 0, scale: 1.08, rotation: 30, transformOrigin: "center center", duration: 0.4 }, 0)
        .to("#skewers", { fill: "#990001", duration: 0.2 }, 0)
        .to("#skewers", { fill: "#B30001", duration: 0.4 }, 0.28)
        .to(flames, { opacity: 1, scaleY: 1, scaleX: 1, duration: 0.35, stagger: { each: 0.05, from: "center" } }, 0.18)
      if (!reduced) tl.call(() => { flickerRef.current?.play(0); smokeRef.current?.play(0) }, undefined, 0.55)
    } else {
      // Only run the close sequence if we were actually cooking — keeps the
      // initial mount (and StrictMode double-invoke) from flashing smoke.
      const lit = flames.length > 0 && (gsap.getProperty(flames[0], "scaleY") as number) > 0.05
      if (!lit) return
      flickerRef.current?.pause()
      smokeRef.current?.pause()
      tl.set(".cook-smoke", { opacity: 0, y: 0, scale: 0.6 }, 0)
        .to(flames, { scaleY: 0, opacity: 0, duration: 0.28, stagger: { each: 0.03, from: "edges" } }, 0)
        .fromTo(".smoke",
          { opacity: 0, y: 0, scale: 0.5 },
          { opacity: 0.9, y: -15, scale: 1.8, duration: 0.75, stagger: 0.12, ease: "power1.out" }, 0.05)
        .to(".smoke", { opacity: 0, duration: 0.45 }, 0.65)
        .to("#skewers", { fill: "#34389A", duration: 0.2 }, 0)
        .to("#skewers", { fill: "#010066", duration: 0.4 }, 0.28)
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
