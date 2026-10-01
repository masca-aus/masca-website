'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
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
    { title: 'Preview and publish', body: 'Review the event preview and check the poster, dates and links. Save and exit keeps a new event as a draft. Publish event approves it for the public website.', tip: 'For an existing published event, use Publish changes when your updates are ready.' },
  ],
};
export function reviewQueueHref(collection: Collection) {
  return `/admin/collections/${collection}?where[submittedForReview][equals]=true&where[_status][equals]=draft`;
}

export function ListingTutorial({ collection, accountId, editor = false }: { collection: Collection; accountId?: string | number; editor?: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const titleID = useId();
  const storageKey = accountId == null ? null : `masca:tutorial:v1:${accountId}:${collection}`;
  const steps: Step[] = [...guides[collection],
    { title: 'Public submissions need your review', body: `Anyone can suggest ${collection === 'careers' ? 'an opportunity' : 'an event'} through the public website form. A successful submission arrives in this CMS as “To be reviewed”. It stays private until published.`, tip: 'Public submission → To be reviewed → Check details → Publish' },
    { title: 'Check a submission before approval', body: 'Open To be reviewed from the list toolbar, then open a record. Check the organisation, dates, eligibility or venue, and application or registration link. Use the private contact details to follow up if anything is missing.', tip: 'Saving a draft does not approve a submission. Public submissions are assigned to National; ask a National editor if your account is read only.' },
    { title: 'Publish only when ready', body: `Once the details are verified, use ${collection === 'careers' ? 'Publish opportunity' : 'Publish event'} on the final form step. This clears the review flag and makes the listing public. If it is not ready, keep it private and add an internal note.`, tip: 'You can replay this guide anytime using Show tutorial.' },
  ];
  useEffect(() => {
    if (editor || !storageKey) return;
    const timer = window.setTimeout(() => {
      try { if (!localStorage.getItem(storageKey)) setOpen(true); } catch { /* Manual replay remains available when storage is blocked. */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [editor, storageKey]);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    title.current?.focus();
  }, [open, index]);
  function close() {
    if (storageKey) { try { localStorage.setItem(storageKey, 'seen'); } catch { /* Best effort. */ } }
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  return <>
    <button ref={trigger} type="button" className="masca-action masca-action--secondary" onClick={() => { setIndex(0); setOpen(true); }}>Show tutorial</button>
    {open && createPortal(<dialog ref={dialog} className="masca-listing-tutorial" aria-labelledby={titleID} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => event.stopPropagation()}>
      <header><span>{collection === 'careers' ? 'Careers' : 'Events'} · Quick guide</span><button type="button" onClick={close} aria-label="Close tutorial">×</button></header>
      <div className="masca-listing-tutorial__progress" role="progressbar" aria-label="Tutorial progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}><span style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
      <div key={index} className="masca-listing-tutorial__page">
        <p className="masca-listing-tutorial__count">Step {index + 1} of {steps.length}</p>
        <h2 ref={title} tabIndex={-1} id={titleID}>{steps[index].title}</h2>
        <p>{steps[index].body}</p>
        {steps[index].tip && <aside>{steps[index].tip}</aside>}
        {index >= 5 && <ol className="masca-listing-tutorial__flow" aria-label="Submission review flow">{['Public form', 'To be reviewed', 'Check details', 'Publish'].map((label, i) => <li key={label}><span aria-hidden="true">{i + 1}</span>{label}</li>)}</ol>}
        {index === 5 && <a href={`/submit/${collection === 'careers' ? 'career' : 'event'}`} target="_blank" rel="noopener noreferrer">View public submission form ↗</a>}
        {!editor && index === steps.length - 1 && <Link href={reviewQueueHref(collection)} onClick={close}>Open submissions to review →</Link>}
      </div>
      <footer><button type="button" className="masca-action masca-action--secondary" onClick={close}>Skip tutorial</button><div><button type="button" className="masca-action masca-action--secondary" disabled={index === 0} onClick={() => setIndex(value => value - 1)}>Back</button><button type="button" className="masca-action masca-action--primary" onClick={() => index === steps.length - 1 ? close() : setIndex(value => value + 1)}>{index === steps.length - 1 ? 'Done' : 'Next'}</button></div></footer>
    </dialog>, document.body)}
  </>;
}
