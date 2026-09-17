"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { adminBackTarget } from './adminBackTarget';

export function DocumentBackLink() {
  const pathname = usePathname();
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const controls = linkRef.current?.closest('.doc-controls');
    if (!controls) return;
    const labelMenu = () => {
      const button = controls.querySelector('.doc-controls__popup .popup-button');
      if (!button) return false;
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'More actions');
      button.setAttribute('title', 'More actions');
      return true;
    };
    if (labelMenu()) return;
    const observer = new MutationObserver(() => { if (labelMenu()) observer.disconnect(); });
    observer.observe(controls, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  const target = adminBackTarget(pathname);
  if (!target) return null;

  return (
    <Link ref={linkRef} className="masca-document-back-link" href={target.href}>
      <span aria-hidden="true">←</span>
      {target.label}
    </Link>
  );
}

export function CollectionBackLink() {
  const pathname = usePathname();
  if (adminBackTarget(pathname)?.href !== "/admin") return null;
  return <div className="masca-collection-back"><DocumentBackLink /></div>;
}
