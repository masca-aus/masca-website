'use client'

import Image from "next/image";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useEffect, useRef, useState } from "react";

import Button from "./Button";

const navLinks = [
  // { name: "Home", href: "/"},
  { name: "About", href: "/about"},
  { name: "Events", href: "/events"},
  { name: "Cares", href: "/care"},
  { name: "Careers", href: "/careers"},
  // { name: "Unite", href: "/unite"},
  { name: "Committee", href: "/committee"},
  { name: "Post with us", href: "/submit"},
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

// Compact mobile menu control; the outer bars form a close icon when open.
function MenuToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const line = "absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-200 ease-out motion-reduce:transition-none";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="col-3 relative z-20 -mr-2 flex size-11 items-center justify-center justify-self-end rounded-lg text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
    >
      <span className="relative block h-5 w-6" aria-hidden="true">
        <span className={`${line} ${open ? "top-[9px] rotate-45" : "top-0"}`} />
        <span className={`${line} top-[9px] ${open ? "opacity-0" : "opacity-100"}`} />
        <span className={`${line} ${open ? "top-[9px] -rotate-45" : "top-[18px]"}`} />
      </span>
    </button>
  );
}

// Centered primary navigation (desktop only).
function DesktopNav({ isActive }: { isActive: IsActive }) {
  return (
    <nav className="col-2 justify-self-center hidden lg:flex gap-2 xl:gap-6">
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
  // breakpoint, where the mobile menu replaces the desktop nav). A paused tween
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
      <MenuToggle open={open} onToggle={() => setOpen((v) => !v)} />
      <DesktopNav isActive={isActive} />
      <DesktopActions />
      <MobileMenu open={open} isActive={isActive} pathname={pathname} />
    </header>
  )
}
