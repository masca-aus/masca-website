import Link from 'next/link';
import type { ReactNode } from 'react';
import './sectionToolbar.css';

/** Shared navigation shell for CMS collection lists. */
export function SectionToolbar({ children, actions, backHref = '/admin', backLabel = 'Dashboard' }: { children: ReactNode; actions?: ReactNode; backHref?: string; backLabel?: string }) {
  return <div className="masca-section-toolbar"><div className="masca-section-toolbar__navigation">
    <Link className="masca-section-toolbar__back" href={backHref}>← {backLabel}</Link>
    {children}
  </div>{actions}</div>;
}
