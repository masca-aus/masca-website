'use client';

import { useMemo, useRef, useState } from 'react';
import { TutorialSpotlight, type SpotlightStep } from './TutorialSpotlight';
import './listingTutorial.css';
import { useDashboardView } from './DashboardTabs';

export function DashboardTutorial({ areas, showEvents, isAdmin }: { areas: string[]; showEvents: boolean; isAdmin: boolean }) {
  const view = useDashboardView() ?? 'workspace';
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const steps = useMemo<SpotlightStep[]>(() => [
    { title: 'Your MASCA workspace', body: 'Start here to find the website sections available to your account. Use the sidebar to browse content. The summary cards open the matching published, draft and review lists. Manage opens a section; the add button starts a new record.', target: '.masca-dashboard__heading' },
    { title: 'Workspace and Metrics', body: 'Switch between your content tools and website metrics here. Your selected branch stays the same. Website traffic always covers the whole website.', target: '.masca-dashboard__tabs' },
    ...(view === 'metrics' ? [
      { title: 'Website traffic', body: 'See visitors and page views for the whole website over the last seven days. Daily traffic, top pages and sources help you understand what people are reading.', target: '.masca-dashboard__metrics' },
      { title: 'Published content', body: 'These counts show currently published content in the sections you can access, filtered by your selected branch. Open a section to browse its records.', target: '.masca-content-metrics' },
    ] : [
    ...(showEvents ? [{ title: 'Check your work', body: 'Your work queues show editable drafts and submissions for the selected branches. Open a count to browse the matching list.', tip: 'Public submissions stay private until an authorised editor reviews and publishes them.', target: '.masca-dashboard__stats' }] : []),
    ...areas.filter(area => area === 'careers' || area === 'events').map(area => ({ title: area === 'careers' ? 'Manage Careers' : 'Manage Events', body: 'Open the section in the sidebar to browse listings and review submissions. Use the add button beside a section to create a listing.', tip: 'Each section has its own Show tutorial guide, including the review and publication flow.', target: '.masca-dashboard__content' })),
    ...(areas.some(area => ['organisations', 'media'].includes(area)) ? [{ title: 'Shared resources', body: 'The sidebar shows your accessible sections. The content overview follows your departments and editing permissions.', target: '.masca-dashboard__content' }] : []),
    ]),
    ...(isAdmin ? [{ title: 'People and access', body: 'Approve Workspace accounts and set viewing and editing permissions here. Only administrators can manage account access.', target: '.masca-nav__account a[href="/admin/collections/users"]' }] : []),
    { title: 'Check the public website', body: 'View website opens the public site in a new tab. Check your published content there; drafts and submissions awaiting review remain private.', target: '.masca-dashboard__website-link' },
  ], [areas, showEvents, isAdmin, view]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <><button ref={trigger} type="button" className="masca-action masca-action--secondary" onClick={() => setOpen(true)}>Tutorial</button>{open && <TutorialSpotlight label="Dashboard" steps={steps} onClose={close} onNavigate={() => {}} />}</>;
}
