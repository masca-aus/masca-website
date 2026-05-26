'use client'

import Image from "next/image";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import Button from "./Button";

const navLinks = [
  { name: "Home", href: "/"},
  { name: "Events", href: "/events"},
  { name: "Welfare", href: "/care"},
  { name: "About", href: "/about"},
  { name: "Contact", href: "/contact"}
]

export default function NavBar() {
  const headerRef = useRef(null)
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  useGSAP(() => {
    gsap.to(headerRef.current, {
      backgroundColor: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      ease: 'entranceEase',
      scrollTrigger: {
        start: 80,
        end: 80,
        toggleActions: 'play none none reverse',
      },
    })
  }, { scope: headerRef })
  

  return (
    <header ref={headerRef} className="fixed top-0 left-0 w-full z-50 grid grid-cols-[auto_auto_auto] py-4 px-4 md:px-16 bg-white">
      {/* Logo mobile + desktop */}
      <Link href="/" className="col-1 justify-self-start">
        <div className="flex items-center gap-4">
          <Image src="/logo/logo.svg" alt="Masca logo" width={40} height={40} priority />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold tracking-wider text-blue-600">MASCA</span>
            <span className="text-xs font-semibold text-gray-700/80 uppercase">malaysian students&apos; council</span>
          </div>
        </div>
      </Link>

      {/* mobile view */}
      <div className="col-3 justify-self-end lg:hidden">
        Hamburger
      </div>

      {/* desktop view */}
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

      <div className="col-3 justify-self-end hidden lg:inline-flex gap-6">
        <Button
          href="/sign-in" variant="ghost"
          className={isActive("/sign-in") ? "text-red-600 border-b-3 border-b-red-600" : "text-blue-600 border-0"}
        >
          Sign In
        </Button>
        <Button href="/sign-up" variant="accent">
          Become a Member
        </Button>
      </div>

    </header>
  )
}