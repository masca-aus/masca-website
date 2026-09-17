'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useConfig, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui';
import { EVENT_EDITOR_STEPS, eventFieldStep, validateEventStep } from '@/features/events/eventEditor';
import { EVENT_TIME_ZONES } from '@/features/events/eventSubmission';
import { useEventEditor } from './EventEditorView';

type Poster = { id?: number | string; url?: string; alt?: string; filename?: string; sizes?: { 'admin-preview'?: { url?: string } } };
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
  const { step, setStep, error, setError, save, saveState } = useEventEditor();
  const data = useEventData();
  const { dispatchFields, setSubmitted } = useForm();
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
    setStepsOpen(false);
    heading.current?.focus();
    if (next > step) {
      const errors: Record<string, string> = Object.assign({}, ...Array.from({ length: next }, (_, index) => validateEventStep(data, index)));
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
      <div className="masca-wizard-progress-label"><span className="masca-wizard-badge" data-live={Boolean(hasPublishedDoc)} title={hasPublishedDoc ? 'Changes save as a draft until you publish again.' : 'Not visible on the website.'}>{hasPublishedDoc ? 'Live' : 'Draft'}</span><span className="masca-wizard-count">Step {step + 1} of 5 · {EVENT_EDITOR_STEPS[step].title}</span></div>
      <button ref={stepToggle} type="button" className="masca-wizard-text-button" aria-expanded={stepsOpen} aria-controls={stepListID} onClick={() => setStepsOpen(open => !open)}>View steps <span aria-hidden="true">{stepsOpen ? '⌃' : '⌄'}</span></button>
    </div>
    <div className="masca-wizard-progress" role="progressbar" aria-label="Event setup progress" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1} aria-valuetext={`Step ${step + 1} of 5: ${EVENT_EDITOR_STEPS[step].title}`}>
      <span style={{ width: `${(step + 1) * 20}%` }} />
    </div>
    <nav id={stepListID} aria-label="Event steps" hidden={!stepsOpen} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setStepsOpen(false); stepToggle.current?.focus(); }
    }}><ol className="masca-wizard-steps">
      {EVENT_EDITOR_STEPS.map(({ title }, index) => <li key={title}>
        <button type="button" onClick={() => moveTo(index)} aria-label={title} aria-current={step === index ? 'step' : undefined} data-complete={index < step && !Object.keys(validateEventStep(data, index)).length}>
          <span className="masca-wizard-step-number" aria-hidden="true">{index < step && !Object.keys(validateEventStep(data, index)).length ? '✓' : index + 1}</span>
          <span className="masca-wizard-step-label">{title}</span>
        </button>
      </li>)}
    </ol></nav>
    <div key={step} className="masca-wizard-intro">
      <h2 ref={heading} tabIndex={-1}>{step === 4 && hasPublishedDoc ? 'Event overview' : EVENT_EDITOR_STEPS[step].title}</h2>
      <p>{hints[step]}</p>
    </div>
    {error && <div className="masca-wizard-error" role="alert">{error}{saveState === 'error' && <button type="button" onClick={() => void save.current?.('draft')}>Retry save</button>}</div>}
    {step === 1 && <p className="masca-wizard-note">Date inputs use your device timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). The public event displays in {EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES] ?? 'the selected state’s timezone'}.</p>}
    {step === 4 && <EventOverview data={data} />}
  </section>;
}

function EventOverview({ data }: { data: Record<string, unknown> }) {
  const { setStep } = useEventEditor();
  const { config } = useConfig();
  const [poster, setPoster] = useState<Poster | null>(null);
  const posterValue = data.poster;
  const posterID = posterValue && typeof posterValue === 'object' && 'id' in posterValue ? posterValue.id : posterValue;
  useEffect(() => {
    if (!posterID) return;
    const controller = new AbortController();
    fetch(`${config.routes.api}/media/${encodeURIComponent(String(posterID))}?depth=0`, { signal: controller.signal, credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(value => setPoster(value))
      .catch(() => { if (!controller.signal.aborted) setPoster(null); });
    return () => controller.abort();
  }, [posterID, config.routes.api]);
  const selectedPoster = posterID && String(poster?.id) === String(posterID) ? poster : null;
  const image = selectedPoster?.sizes?.['admin-preview']?.url || selectedPoster?.url;
  const text = (key: string) => typeof data[key] === 'string' && data[key] ? String(data[key]) : 'Not provided';
  const date = (key: string) => {
    if (!data[key] || !Number.isFinite(Date.parse(String(data[key])))) return 'Not provided';
    return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES] ?? 'Australia/Sydney' }).format(new Date(String(data[key])));
  };
  return <div className="masca-event-overview">
    <article className="masca-event-preview" aria-label="Public event preview">
      {image ? /* eslint-disable-next-line @next/next/no-img-element */
        <img src={image} alt={selectedPoster?.alt || text('title')} /> : <div className="masca-event-preview__placeholder">{posterID ? 'Poster selected · preview unavailable' : 'No poster selected'}</div>}
      <div className="masca-event-preview__body"><span className="masca-wizard-eyebrow">Public event preview</span><h3>{text('title')}</h3><p>{text('organisation')}</p><p>{date('startDate')} · {text('state')}</p><p>{text('venue')}</p><p className="masca-event-preview__description">{text('description')}</p></div>
    </article>
    <div className="masca-overview-sections">
      {[
        { title: 'Basics', content: `${text('title')} · ${text('organisation')}` },
        { title: 'Date and location', content: `${date('startDate')}${data.endDate ? ` – ${date('endDate')}` : ''} · ${text('venue')} · ${EVENT_TIME_ZONES[data.state as keyof typeof EVENT_TIME_ZONES] ?? ''}` },
        { title: 'Poster and links', content: `${selectedPoster?.filename || (posterID ? 'Poster selected' : 'No poster')} · ${data.ticketURL || 'No registration link'}` },
        { title: 'Contact details · committee only', content: `${text('contactName')} · ${text('contactEmail')}${data.internalNotes ? `\n${data.internalNotes}` : ''}` },
      ].map(({ title, content }, index) => <section className={index === 3 ? 'masca-overview-section masca-overview-section--private' : 'masca-overview-section'} key={title}><div><h3>{title}</h3><p>{content}</p></div><button type="button" onClick={() => setStep(index)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></section>)}
    </div>
  </div>;
}

export function EventEditorFooter() {
  const { step, setStep, save, saveState, setError, setSaveStatusTarget } = useEventEditor();
  const { getData, dispatchFields, setSubmitted, disabled } = useForm();
  const { hasPublishedDoc, uploadStatus } = useDocumentInfo();
  const next = () => {
    const errors = validateEventStep(getData(), step);
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
    <div className="masca-wizard-save-actions"><button type="button" className="masca-wizard-text-button" disabled={busy} onClick={() => void save.current?.('exit')}>Save and exit</button><span ref={setSaveStatusTarget} /></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-text-button" onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}
      {step < 4 ? <button type="button" className="masca-wizard-primary" onClick={next} disabled={disabled}>Continue</button> : <button type="button" className="masca-wizard-primary" disabled={busy} onClick={() => void save.current?.('publish')}>{hasPublishedDoc ? 'Publish changes' : 'Publish event'}</button>}
    </div>
  </div>;
}
