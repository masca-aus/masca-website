'use client';
import { ListingTools } from './ListingTools';
import { ListingTutorial } from './ListingTutorial';
import { CMSStatusBadge } from './CMSStatusBadge';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui';
import { EVENT_EDITOR_STEPS, eventFieldStep, validateEventStep } from '@/features/events/eventEditor';
import { EVENT_TIME_ZONES } from '@/features/events/eventSubmission';
import { useEventEditor } from './EventEditorView';
import { useEventPoster, type EventPoster } from './useEventPoster';

function useEventData() {
  return useFormFields(([fields]) => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])));
}
const hints = [
  'Start with the information students need to understand your event.',
  'Add the time and place. Check the timezone before continuing.',
  'Choose the poster students will see and an optional registration link.',
  'These contact details and notes are for the MASCA committee only.',
  'Check how your event will appear. Publish only when everything is ready.',
];

export function EventEditorHeader() {
  const { step, setStep, error, setError, save, saveState, dateSelectionValidationRef } = useEventEditor();
  const { dispatchFields, setSubmitted, getData } = useForm();
  const fieldValues = useFormFields(([fields]) => JSON.stringify(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]))));
  useEffect(() => {
    if (error === 'Please complete the highlighted details before continuing.' && !Object.keys(validateEventStep(JSON.parse(fieldValues), step)).length && !Object.keys(dateSelectionValidationRef?.current?.() ?? {}).length) setError('');
  }, [fieldValues, step, error, setError, dateSelectionValidationRef]);
  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.masca-events-editor [aria-invalid="true"]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [error, step]);
  const state = useFormFields(([fields]) => fields.state?.value);
  const poster = useEventPoster(step);
  const { hasPublishedDoc } = useDocumentInfo();
  const heading = useRef<HTMLHeadingElement>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const stepToggle = useRef<HTMLButtonElement>(null);
  const stepListID = useId();
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) {
      heading.current?.focus({ preventScroll: true });
    }
    mounted.current = true;
  }, [step]);
  const moveTo = (next: number) => {
    const data = getData();
    setStepsOpen(false);
    heading.current?.focus({ preventScroll: true });
    if (next > step) {
      const errors: Record<string, string> = Object.assign({}, ...Array.from({ length: next }, (_, index) => validateEventStep(data, index)), next > 1 ? dateSelectionValidationRef?.current?.() : {});
      if (Object.keys(errors).length) {
        dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
        setSubmitted(true);
        setStep(eventFieldStep(Object.keys(errors)[0]));
        setError('Please complete the highlighted details before continuing.');
        return;
      }
    }
    setError('');
    setStep(next);
  };
  return <section className="masca-wizard-header" aria-label="Event editor">
    <ListingTutorial collection="events" editor currentStep={step} onPreviewStep={setStep} />
    <div className="masca-wizard-heading-row">
      <div className="masca-wizard-progress-label"><CMSStatusBadge /><span className="masca-wizard-count">Step {step + 1} of 5 · {EVENT_EDITOR_STEPS[step].title}</span></div>
      <button ref={stepToggle} type="button" className="masca-wizard-text-button" aria-expanded={stepsOpen} aria-controls={stepListID} onClick={() => setStepsOpen(open => !open)}>View steps <span className="masca-wizard-step-chevron" aria-hidden="true">⌄</span></button>
    </div>
    <div className="masca-wizard-progress" role="progressbar" aria-label="Event setup progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of 5: ${EVENT_EDITOR_STEPS[step].title}`}>
      <span style={{ width: `${(step + 1) * 20}%` }} />
    </div>
    <nav id={stepListID} className="masca-wizard-step-disclosure" data-open={stepsOpen} aria-label="Event steps" aria-hidden={!stepsOpen} inert={!stepsOpen} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setStepsOpen(false); stepToggle.current?.focus(); }
    }}><div className="masca-wizard-step-disclosure__inner"><ol className="masca-wizard-steps">
      {EVENT_EDITOR_STEPS.map(({ title }, index) => {
        const complete = stepsOpen && index < step && !Object.keys(validateEventStep(getData(), index)).length;
        return <li key={title}>
        <button type="button" onClick={() => moveTo(index)} tabIndex={stepsOpen ? 0 : -1} aria-label={title} aria-current={step === index ? 'step' : undefined} data-complete={complete}>
          <span className="masca-wizard-step-number" aria-hidden="true">{complete ? '✓' : index + 1}</span>
          <span className="masca-wizard-step-label">{title}</span>
        </button>
      </li>; })}
    </ol></div></nav>
    <div key={step} className="masca-wizard-intro">
      <h2 ref={heading} tabIndex={-1}>{step === 4 && hasPublishedDoc ? 'Event overview' : EVENT_EDITOR_STEPS[step].title}</h2>
      <p>{hints[step]}</p>
    </div>
    {error && <div className="masca-wizard-error" role="alert">{error}{saveState === 'error' && <button type="button" onClick={() => void save.current?.('draft')}>Retry save</button>}</div>}
    {step === 1 && <p className="masca-wizard-note">The public event displays in {EVENT_TIME_ZONES[state as keyof typeof EVENT_TIME_ZONES] ?? 'the selected state’s timezone'}.</p>}
    {step === 4 && <EventOverview poster={poster} />}
  </section>;
}

function EventOverview({ poster }: { poster: EventPoster | null }) {
  const { setStep } = useEventEditor();
  const data = useEventData();
  const image = poster?.sizes?.['admin-preview']?.url || poster?.url;
  const text = (key: string) => typeof data[key] === 'string' && data[key] ? String(data[key]) : 'Not provided';
  const date = (key: string) => {
    if (!data[key] || !Number.isFinite(Date.parse(String(data[key])))) return 'Not provided';
    return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES] ?? 'Australia/Sydney' }).format(new Date(String(data[key])));
  };
  const registration = typeof data.ticketURL === 'string' && data.ticketURL.startsWith('https://') ? data.ticketURL : null;
  const row = (label: string, value: React.ReactNode) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>;
  const heading = (title: string, step: number, label: string) => <header><h4>{title}</h4><button type="button" className="masca-wizard-text-button" onClick={() => setStep(step)} aria-label={label}>Edit</button></header>;
  return <div className="masca-event-overview">
    <article className="masca-event-review" aria-label="Public event preview">
      <div className="masca-event-review__identity"><h3>{text('title')}</h3><p>{text('organisation')}</p></div>
      <section className="masca-event-review__section">
        {heading('Event details', 0, 'Edit basics')}
        <dl>{row('Description', text('description'))}</dl>
      </section>
      <section className="masca-event-review__section">
        {heading('Date and location', 1, 'Edit date and location')}
        <dl>
          {row('Starts', date('startDate'))}
          {data.endDate ? row('Ends', date('endDate')) : null}
          {row('Timezone', EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES] ?? 'Australia/Sydney')}
          {row('Venue', text('venue'))}
          {row('State or territory', text('state'))}
          {data.streetAddress ? row('Street address', text('streetAddress')) : null}
          {data.venueDetails ? row('Venue details', text('venueDetails')) : null}
        </dl>
      </section>
      <section className="masca-event-review__section">
        {heading('Poster and links', 2, 'Edit poster and links')}
        <dl>
          {row('Poster', image ? /* eslint-disable-next-line @next/next/no-img-element */
            <img className="masca-event-review__poster" src={image} alt={poster?.alt || text('title')} width={100} height={125} decoding="async" /> : data.poster ? 'Poster selected · preview unavailable' : 'No poster selected')}
          {row('Registration', registration ? <a href={registration} target="_blank" rel="noopener noreferrer">Registration link ↗</a> : 'No registration link')}
        </dl>
      </section>
    </article>
    <section className="masca-event-review__section masca-event-review__private">
      {heading('Contact details · committee only', 3, 'Edit contact details · committee only')}
      <p className="masca-event-review__hint">These details are not shown on the public website.</p>
      <dl>{row('Contact name', text('contactName'))}{row('Contact email', text('contactEmail'))}
        {data.internalNotes ? row('Internal notes', text('internalNotes')) : null}
      </dl>
    </section>
  </div>;
}

export function EventEditorFooter() {
  const { step, setStep, save, saveState, setError, setSaveStatusTarget, dateSelectionValidationRef } = useEventEditor();
  const { getData, dispatchFields, setSubmitted, disabled } = useForm();
  const { hasPublishedDoc, uploadStatus } = useDocumentInfo();
  const next = () => {
    const errors = { ...validateEventStep(getData(), step), ...(step === 1 ? dateSelectionValidationRef?.current?.() : {}) };
    if (Object.keys(errors).length) {
      dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
      setSubmitted(true);
      setError('Please complete the highlighted details before continuing.');
      return;
    }
    setError('');
    setStep(value => Math.min(value + 1, 4));
  };
  const busy = disabled || saveState === 'saving' || uploadStatus === 'uploading';
  return <>{step === 4 && <ListingTools collection="events" review />}<div className="masca-wizard-footer">
    <div className="masca-wizard-save-actions"><button data-tutorial="save" type="button" className="masca-wizard-secondary" disabled={busy} onClick={() => void save.current?.('exit')}>Save and exit</button><span ref={setSaveStatusTarget} /></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-secondary" onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}
      {step < 4 ? <button type="button" className="masca-wizard-primary" onClick={next} disabled={disabled}>Continue</button> : <button data-tutorial="publish" type="button" className="masca-wizard-primary" disabled={busy} onClick={() => void save.current?.('publish')}>{hasPublishedDoc ? 'Publish changes' : 'Publish event'}</button>}
    </div>
  </div></>;
}
