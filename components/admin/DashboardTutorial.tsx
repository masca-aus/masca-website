'use client';

import { useMemo, useRef, useState } from 'react';
import { TutorialSpotlight, type SpotlightStep } from './TutorialSpotlight';
import './listingTutorial.css';

export function DashboardTutorial({ areas, showEvents, isAdmin }: { areas: string[]; showEvents: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const steps = useMemo<SpotlightStep[]>(() => [
    { title: 'Your MASCA workspace', body: 'Start here to find the website sections available to your account. Manage opens a section; View only means you can read it but cannot make changes.', target: '.masca-dashboard__heading' },
    ...(showEvents ? [{ title: 'Check event progress', body: 'These counts are for events. Open Drafts to continue unfinished work, Awaiting review to check public submissions, or Published events to see what is live.', tip: 'Public submissions stay private until an authorised editor reviews and publishes them.', target: '.masca-dashboard__shortcuts' }] : []),
    ...areas.filter(area => area === 'careers' || area === 'events').map(area => ({ title: area === 'careers' ? 'Manage Careers' : 'Manage Events', body: 'Open Manage to browse listings and review public submissions in To be reviewed. If you have editing access, use the add button to create a listing.', tip: 'Each section has its own Show tutorial guide, including the review and publication flow.', target: `[data-area="${area}"]` })),
    ...(areas.some(area => ['organisations', 'media'].includes(area)) ? [{ title: 'Shared resources', body: 'Use the organisation directory and media library available to your account to keep website content consistent. Editing controls depend on your assigned access.', target: '[aria-labelledby="manage-resources"]' }] : []),
    ...(isAdmin ? [{ title: 'People and access', body: 'Approve Workspace accounts and set viewing and editing permissions here. Only administrators can manage account access.', target: '.masca-dashboard > footer' }] : []),
    { title: 'Check the public website', body: 'View website opens the public site in a new tab. Check your published content there; drafts and submissions awaiting review remain private.', target: '.masca-dashboard__heading a' },
  ], [areas, showEvents, isAdmin]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <><button ref={trigger} type="button" className="masca-action masca-action--secondary" onClick={() => setOpen(true)}>Show tutorial</button>{open && <TutorialSpotlight label="Dashboard" steps={steps} onClose={close} onNavigate={() => {}} />}</>;
}
