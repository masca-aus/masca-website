"use client";

import { Link, NavToggler, useNav } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { BriefcaseBusiness, CalendarDays, Handshake, House, Images, Building2, Users, UserRound, PanelLeftClose, ShieldCheck, LogOut } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";

const groups = [
  { label: "Content", items: [
    { slug: "events", label: "Events", icon: CalendarDays, color: "#ef476f" },
    { slug: "careers", label: "Careers", icon: BriefcaseBusiness, color: "#ffcc00" },
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

  useEffect(() => {
    // Payload closes on small phones; also close its tablet overlay after navigation.
    if (window.matchMedia("(max-width: 1024px)").matches) setNavOpen(false);
  }, [pathname, setNavOpen]);

  if (dashboard) return <span className="masca-dashboard-nav-hidden" hidden />;

  return (
    <aside className={["nav", "masca-nav", navOpen && "nav--nav-open", hydrated && "nav--nav-hydrated", shouldAnimate && "nav--nav-animate"].filter(Boolean).join(" ")} inert={!navOpen}>
      <div className="nav__scroll" ref={navRef}>
        <div className="masca-nav__heading"><span>MASCA <small>CMS</small></span><NavToggler><PanelLeftClose size={19} /></NavToggler></div>
        <nav aria-label="CMS navigation" className="masca-nav__links">
          <Link href="/admin" className="masca-nav__link"><House size={19} />Dashboard</Link>
          {groups.map(group => {
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
            <div className="masca-nav__theme"><ThemeToggle /></div>
            {visibleEntities.collections.includes("users") && <Link href="/admin/collections/users" className="masca-nav__link" aria-current={pathname.startsWith("/admin/collections/users") ? "page" : undefined}><ShieldCheck size={19} />CMS access</Link>}
            <Link href="/admin/account" className="masca-nav__link" aria-current={pathname === "/admin/account" ? "page" : undefined}><UserRound size={19} />My account</Link>
            <Link href="/admin/logout" prefetch={false} className="masca-nav__link"><LogOut size={19} />Log out</Link>
          </div>
        </nav>
      </div>
    </aside>
  );
}
