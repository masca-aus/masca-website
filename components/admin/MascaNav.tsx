"use client";

import { Link, NavToggler, useNav } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { BriefcaseBusiness, CalendarDays, Handshake, House, Images, Building2, Users, UserRound, PanelLeftClose, PanelLeftOpen, ShieldCheck, LogOut } from "lucide-react";

import { version } from "@/package.json";

import { MascaMark } from "./MascaBrand";
import { ThemeToggle } from "./ThemeToggle";

const groups = [
  { label: "Content", items: [
    { slug: "careers", label: "Careers", icon: BriefcaseBusiness, color: "#ffcc00" },
    { slug: "events", label: "Events", icon: CalendarDays, color: "#ef476f" },
    { slug: "committee", label: "Committee", icon: Users, color: "#9bdd9b" },
    { slug: "sponsors", label: "Sponsors", icon: Handshake, color: "#86b8ef" },
  ] },
  { label: "Resources", items: [
    { slug: "organisations", label: "Organisations", icon: Building2, color: "var(--theme-elevation-400)" },
    { slug: "media", label: "Media", icon: Images, color: "var(--theme-elevation-400)" },
  ] },
];

export function MascaNav({ visibleEntities }: { visibleEntities: { collections: string[] } }) {
  const pathname = usePathname();
  const { navOpen, navRef, hydrated, shouldAnimate, setNavOpen } = useNav();
  const dashboard = pathname === "/admin" || pathname === "/admin/";

  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1025px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const open = navOpen || (dashboard && desktop);

  useEffect(() => {
    if (!hydrated) return;
    // Payload closes on small phones; also close its tablet overlay after navigation.
    if (window.matchMedia("(max-width: 1024px)").matches) setNavOpen(false);

  }, [pathname, dashboard, hydrated, setNavOpen]);

  return (
    <>
    {dashboard && !open && <button type="button" className="masca-dashboard-menu" aria-label="Open account menu" onClick={() => setNavOpen(true)}><PanelLeftOpen size={20} /><span>Menu</span></button>}
    <aside className={["nav", "masca-nav", dashboard && "masca-nav--dashboard", open && "nav--nav-open", hydrated && "nav--nav-hydrated", shouldAnimate && "nav--nav-animate"].filter(Boolean).join(" ")} inert={!open}>
      <div className="nav__scroll" ref={navRef}>
        <div className="masca-nav__heading"><span className="masca-nav__brand"><MascaMark /><span>MASCA <small>CMS</small></span></span><NavToggler><PanelLeftClose size={19} /></NavToggler></div>
        <nav aria-label="CMS navigation" className="masca-nav__links">
          {!dashboard && <Link href="/admin" className="masca-nav__link"><House size={19} />Dashboard</Link>}
          {!dashboard && groups.map(group => {
            const items = group.items.filter(item => visibleEntities.collections.includes(item.slug));
            return items.length ? <section key={group.label} aria-label={group.label}>
              <h2>{group.label}</h2>
              {items.map(({ slug, label, icon: Icon, color }) => {
                const href = `/admin/collections/${slug}`;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return <Link key={slug} href={href} className="masca-nav__link" aria-current={active ? "page" : undefined} style={{ "--section-accent": color } as CSSProperties}><span className="masca-nav__icon"><Icon size={18} /></span>{label}</Link>;
              })}
            </section> : null;
          })}
          <div className="masca-nav__account">
            {dashboard && <h2>Settings</h2>}
            <div className="masca-nav__theme"><ThemeToggle /></div>
            {visibleEntities.collections.includes("users") && <Link href="/admin/collections/users" className="masca-nav__link" aria-current={pathname.startsWith("/admin/collections/users") ? "page" : undefined}><ShieldCheck size={19} />People & access</Link>}
            <Link href="/admin/account" className="masca-nav__link" aria-current={pathname === "/admin/account" ? "page" : undefined}><UserRound size={19} />My account</Link>
            <Link href="/admin/logout" prefetch={false} className="masca-nav__link"><LogOut size={19} />Log out</Link>
          </div>
        </nav>
        <p className="masca-nav__version" aria-label={`MASCA CMS version ${version}`}>MASCA CMS <span>v{version}</span></p>
      </div>
    </aside>
    </>
  );
}
