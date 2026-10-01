'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useMemo } from 'react';
import { TutorialSpotlight, type SpotlightStep } from './TutorialSpotlight';
import './listingTutorial.css';

type Collection = 'careers' | 'events';
type Step = { title: string; body: string; tip?: string };
const guides: Record<Collection, Step[]> = {
  careers: [
    { title: 'Create a Careers listing', body: 'Choose Create new Opportunity to start. The form walks you through four sections. Fields marked * must be completed before continuing.', tip: 'You can also review opportunities sent through the public form.' },
    { title: 'Role and company', body: 'Add the job title, company, job type and industry. Check the company website and logo so students can recognise the employer.' },
    { title: 'Location and eligibility', body: 'Choose the country, state and city, then the work arrangement. Check whether international students can apply and which study levels are eligible.', tip: 'Do not assume working rights. Confirm them with the employer when unclear.' },
    { title: 'Application and details', body: 'Add the application link or email, listed date, pay and description. Use the date picker for a deadline, or leave it empty for rolling applications.', tip: 'Rolling listings expire after 60 days. Reconfirm availability before updating the listed date. Internal notes stay private.' },
    { title: 'Review and publish', body: 'Check the final summary. Save draft keeps the listing private; Publish opportunity makes it public. You can only publish within the access assigned to your account.' },
  ],
  events: [
    { title: 'Create an event', body: 'Choose Create new Event to start. The form walks you through five sections. Fields marked * must be completed before continuing.', tip: 'You can also review events sent through the public form.' },
    { title: 'Basics', body: 'Add a clear title, choose the student association using the organisation search, and describe the event. You can enter another organiser if it is not in the directory.' },
    { title: 'Date and location', body: 'Choose One day for a single-day event or Date range for a longer event. Check the start time, optional end time, venue and state.', tip: 'Times follow the selected state’s timezone. An end time must not be before the start.' },
    { title: 'Poster, links and contact details', body: 'Add a poster and registration link, then check the contact name and email. Contact details and internal notes are private to the committee.' },
    { title: 'Review and publish', body: 'Review the event preview and check the poster, dates and links. Save and exit keeps a new event as a draft. Publish event approves it for the public website.', tip: 'For an existing published event, use Publish changes when your updates are ready.' },
  ],
};
export function reviewQueueHref(collection: Collection) {
  return `/admin/collections/${collection}?where[submittedForReview][equals]=true&where[_status][equals]=draft`;
}

export function ListingTutorial({ collection, accountId, editor = false, currentStep = 0, onPreviewStep }: { collection: Collection; accountId?: string | number; editor?: boolean; currentStep?: number; onPreviewStep?: (step: number) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const originalStep = useRef(currentStep);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!editor) return;
    const slot = document.createElement('li');
    slot.className = 'masca-tutorial-header-slot';
    const attach = () => {
      const tabs = document.querySelector('.doc-tabs__tabs');
      if (tabs && slot.parentElement !== tabs) {
        tabs.prepend(slot);
        setHeaderSlot(slot);
      }
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); slot.remove(); };
  }, [editor]);
  const storageKey = accountId == null ? null : `masca:tutorial:v2:${accountId}:${collection}`;
  const continuationKey = `masca:tutorial:continue:${collection}`;
  const steps = useMemo<SpotlightStep[]>(() => {
    if (!editor) return [
      { ...guides[collection][0], target: `a[href="/admin/collections/${collection}/create"]`, action: 'create' },
      { title: 'Public submissions need your review', body: 'The public submission form sends records here as “To be reviewed”. They stay private until an authorised editor checks and publishes them.', tip: 'Public form → To be reviewed → Check details → Publish', target: '[data-tutorial="review-queue"]', action: 'review' },
      { title: 'Open a listing to check its details', body: 'Open a title in the table to review the form, dates and links. Use Show tutorial inside the editor for a guided tour of its fields.', target: 'table a, .table a' },
      { title: 'Keep your listings current', body: 'Use Archived to find previous listings. Restore an archived listing as a draft, check its details, then publish when ready.', target: '[data-tutorial="archived"]' },
    ];
    const formSteps = collection === 'careers' ? guides.careers.slice(1) : [guides.events[1], guides.events[2], { title: 'Poster and links', body: 'Add the event poster and check the registration link.' }, { title: 'Contact details', body: 'Check the submitter’s name and email. These details and internal notes stay private to the committee.' }, guides.events[4]];
    const count = formSteps.length;
    return [
      ...formSteps.map((s, i) => ({ ...s, editorStep: i, target: i === count - 1 ? '[data-tutorial="publish"]' : collection === 'careers' ? `.masca-career-step-${i}.field-type, .masca-wizard-intro` : i === 0 ? '#field-title, .masca-wizard-intro' : i === 1 ? '.masca-event-dates__summary' : i === 2 ? '#field-ticketURL, .masca-wizard-intro' : '#field-contactName, .masca-wizard-intro' })),
      { title: 'Save your progress privately', body: collection === 'careers' ? 'Save draft keeps a new opportunity private. Saving a submission as a draft leaves it in the review queue.' : 'Save and exit keeps a new event private. Saving a submission as a draft leaves it in the review queue.', target: '[data-tutorial="save"]', editorStep: count - 1 },
      { title: 'Approve a public submission', body: 'Check every detail and use the private contact information if anything is missing. Publishing is the approval action: it clears “To be reviewed” and makes the listing public.', tip: 'The tutorial never saves or publishes. Close it when you are ready to edit.', target: '[data-tutorial="publish"]', editorStep: count - 1 },
    ];
  }, [collection, editor]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (editor && sessionStorage.getItem(continuationKey)) {
          sessionStorage.removeItem(continuationKey); setOpen(true);
        } else if (!editor && storageKey && !localStorage.getItem(storageKey)) setOpen(true);
      } catch { /* Manual replay remains available. */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [editor, storageKey, continuationKey]);
  function close() {
    if (storageKey) { try { localStorage.setItem(storageKey, 'seen'); } catch { /* Best effort. */ } }
    if (editor) onPreviewStep?.(originalStep.current);
    setOpen(false);
    trigger.current?.focus();
  }
  const tutorialButton = <button ref={trigger} type="button" className="masca-action masca-action--secondary" onClick={() => { originalStep.current = currentStep; setOpen(true); }}>Show tutorial</button>;
  return <>
    {headerSlot ? createPortal(tutorialButton, headerSlot) : tutorialButton}
    {open && <TutorialSpotlight steps={steps} label={collection === 'careers' ? 'Careers' : 'Events'} onClose={close} onPreviewStep={onPreviewStep} onNavigate={(href, action) => {
      if (action === 'create') { try { sessionStorage.setItem(continuationKey, 'true'); } catch { /* Replay inside the form is still available. */ } }
      close(); window.location.assign(href);
    }} />}
  </>;
}
