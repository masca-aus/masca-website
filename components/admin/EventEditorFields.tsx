'use client';
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
      heading.current?.focus();
    }
    mounted.current = true;
  }, [step]);
  const moveTo = (next: number) => {
    const data = getData();
    setStepsOpen(false);
    heading.current?.focus();
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
  return <div className="masca-event-overview">
    <article className="masca-event-preview" aria-label="Public event preview">
      <span className="masca-wizard-eyebrow">Public event preview</span>
      <div className="masca-event-preview__main">
        <div className="masca-event-preview__poster">
          {image ? /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt={poster?.alt || text('title')} width={144} height={180} decoding="async" /> : <div className="masca-event-preview__placeholder">{data.poster ? 'Poster selected · preview unavailable' : 'No poster selected'}</div>}
          <button type="button" className="masca-wizard-text-button" onClick={() => setStep(2)} aria-label="Edit poster and links">Edit poster & links</button>
        </div>
        <div className="masca-event-preview__body">
          <div className="masca-overview-heading"><div><h3>{text('title')}</h3><p>{text('organisation')}</p></div><button type="button" className="masca-wizard-text-button" onClick={() => setStep(0)} aria-label="Edit basics">Edit details</button></div>
          <p className="masca-event-preview__description">{text('description')}</p>
          <section className="masca-overview-section">
            <div><h4>Date and location</h4><p>{date('startDate')}{data.endDate ? ` – ${date('endDate')}` : ''}</p><p>{text('venue')} · {text('state')}</p>{data.streetAddress ? <p>{text('streetAddress')}</p> : null}{data.venueDetails ? <p className="masca-event-preview__description">{text('venueDetails')}</p> : null}<small>{EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES]}</small></div>
            <button type="button" className="masca-wizard-text-button" onClick={() => setStep(1)} aria-label="Edit date and location">Edit</button>
          </section>
          <p className="masca-event-preview__registration">{registration ? <a href={registration} target="_blank" rel="noopener noreferrer">Registration link ↗</a> : 'No registration link'}</p>
        </div>
      </div>
    </article>
    <h3 className="masca-overview-review-heading">Before publishing</h3>
    <section className="masca-overview-section masca-overview-section--private">
      <div><h3>Contact details · committee only</h3><p>{text('contactName')} · {text('contactEmail')}</p>
        {data.internalNotes ? <details><summary>Internal notes</summary><p>{text('internalNotes')}</p></details> : null}
      </div>
      <button type="button" className="masca-wizard-text-button" onClick={() => setStep(3)} aria-label="Edit contact details · committee only">Edit</button>
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
  return <div className="masca-wizard-footer">
    <div className="masca-wizard-save-actions"><button type="button" className="masca-wizard-secondary" disabled={busy} onClick={() => void save.current?.('exit')}>Save and exit</button><span ref={setSaveStatusTarget} /></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-secondary" onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}
      {step < 4 ? <button type="button" className="masca-wizard-primary" onClick={next} disabled={disabled}>Continue</button> : <button type="button" className="masca-wizard-primary" disabled={busy} onClick={() => void save.current?.('publish')}>{hasPublishedDoc ? 'Publish changes' : 'Publish event'}</button>}
    </div>
  </div>;
}
