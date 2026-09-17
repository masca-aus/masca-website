"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const collectionLabels: Record<string, string> = {
  committee: "Committee",
  events: "Events",
  media: "Media",
  sponsors: "Sponsors",
  users: "Users",
};

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
  const collectionSlug = pathname.split("/").at(3);
  const collectionLabel = collectionSlug ? collectionLabels[collectionSlug] : undefined;

  if (!collectionSlug || !collectionLabel) return null;

  return (
    <Link ref={linkRef} className="masca-document-back-link" href={`/admin/collections/${collectionSlug}`}>
      <span aria-hidden="true">←</span>
      Back to {collectionLabel}
    </Link>
  );
}
