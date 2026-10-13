"use client";
import { ListingTools } from "./ListingTools";

import { AdminLink as Link } from "./AdminNavigationContext";
import { useDocumentTitle, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { SectionToolbar } from './SectionToolbar';
import { adminBackTarget } from './adminBackTarget';

export function DocumentBackLink() {
  const { title, setDocumentTitle } = useDocumentTitle();
  const { data } = useDocumentInfo();
  const pathname = usePathname();
  const placeholder = pathname === "/admin/collections/users/create" ? "Add member" : "Untitled";
  useEffect(() => {
    if (["[Untitled]", "Untitled"].includes(title) && !data?.title) setDocumentTitle(placeholder);
  }, [title, data?.title, placeholder, setDocumentTitle]);
  useEffect(() => {
    // Event's nested edit view has a separate title context from the page header.
    const cleanPlaceholder = () => {
      const heading = document.querySelector<HTMLElement>('.doc-header__title');
      if (heading && heading.textContent?.trim() !== placeholder && ['[Untitled]', 'Untitled'].includes(heading.textContent?.trim() || '')) {
        heading.textContent = placeholder;
        heading.setAttribute('title', placeholder);
      }
    };
    cleanPlaceholder();
    const observer = new MutationObserver(cleanPlaceholder);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, placeholder]);
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
    <><Link restoreContext ref={linkRef} className="masca-document-back-link" href={target.href}>
      <span aria-hidden="true">←</span>
      {target.label}
    </Link>{["events","careers"].includes(pathname.split("/")[3]) && <ListingTools collection={pathname.split("/")[3] as "events"|"careers"} />}</>
  );
}

export function CollectionBackLink() {
  const pathname = usePathname();
  if (adminBackTarget(pathname)?.href !== "/admin") return null;
  const slug = pathname.split('/')[3];
  const label = { careers: 'Careers', organisations: 'Organisations', committee: 'Committee', media: 'Media', sponsors: 'Sponsors', users: 'CMS access', events: 'Events' }[slug] || 'Manage';
  return <div className="masca-section-shell"><SectionToolbar collection={slug}><span className="masca-section-toolbar__current">{label}</span></SectionToolbar></div>;
}
