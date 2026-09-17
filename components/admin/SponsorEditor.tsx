'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { DefaultEditView, SaveButton, useDocumentInfo, useForm, useFormFields, useFormProcessing, useFormSubmitted, useFormModified } from '@payloadcms/ui';
import type { DocumentViewClientProps } from 'payload';
import { SPONSOR_STEPS, sponsorFieldStep, sponsorStepErrors } from '@/features/sponsors/sponsorEditor';
import { useMediaPreview } from './useEventPoster';
import './eventEditor.css';
import './sponsorEditor.css';

const Context = createContext<{ step: number; setStep: (step: number) => void; attemptedSave: boolean; setAttemptedSave: (value: boolean) => void; error: string; setError: (error: string) => void; nextRef: React.RefObject<(() => void) | null> } | null>(null);
function useSponsorEditor() { const value = useContext(Context); if (!value) throw new Error('Sponsor editor is missing'); return value; }

export function SponsorEditorView(props: DocumentViewClientProps) {
  const { id } = useDocumentInfo();
  const [step, setStep] = useState(id ? 2 : 0);
  const [error, setError] = useState('');
  const [attemptedSave, setAttemptedSave] = useState(false);
  const nextRef = useRef<(() => void) | null>(null);
  return <Context.Provider value={{ step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave }}>
    <div className="masca-event-editor masca-sponsor-editor" data-step={step} onSubmitCapture={event => {
      // A media drawer has its own form and must keep its native submit behaviour.
      if (!(event.target instanceof HTMLFormElement) || !event.target.matches('.collection-edit--sponsors > form')) return;
      if (step < 2) {
        event.preventDefault(); event.stopPropagation(); nextRef.current?.();
      } else setAttemptedSave(true);
    }}><DefaultEditView {...props} /></div>
  </Context.Provider>;
}
export function SponsorSaveControl() { return null; }

export function SponsorEditorHeader() {
  const { step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave } = useSponsorEditor();
  const { getData, dispatchFields, setSubmitted } = useForm();
  const logo = useMediaPreview(step, 'logo', 2);
  const busy = useFormProcessing();
  const submitted = useFormSubmitted();
  const firstError = useFormFields(([fields]) => Object.keys(fields).find(key => fields[key].valid === false));
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listID = useId();
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (attemptedSave && submitted && firstError && !busy) { setStep(sponsorFieldStep(firstError)); setError('Check the highlighted field before saving.'); setAttemptedSave(false); }
  }, [attemptedSave, firstError, submitted, busy, setStep, setError, setAttemptedSave]);
  const moveTo = (target: number) => {
    if (busy) return;
    setOpen(false);
    setAttemptedSave(false);
    if (target > step) {
      for (let index = 0; index < target; index++) {
        const errors = sponsorStepErrors(getData(), index);
        if (Object.keys(errors).length) {
          dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
          setSubmitted(true); setStep(index); setError('Complete the highlighted fields to continue.'); heading.current?.focus(); return;
        }
      }
    }
    setError(''); setStep(target); heading.current?.focus();
  };
  useEffect(() => {
    nextRef.current = () => moveTo(Math.min(step + 1, 2));
    return () => { nextRef.current = null; };
  });
  return <section className="masca-wizard-header" aria-label="Sponsor editor">
    <div className="masca-wizard-heading-row"><div className="masca-wizard-progress-label"><span className="masca-wizard-badge">Sponsor</span><span className="masca-wizard-count">Step {step + 1} of 3 · {SPONSOR_STEPS[step].title}</span></div><button ref={toggle} type="button" className="masca-wizard-text-button" aria-expanded={open} aria-controls={listID} onClick={() => setOpen(value => !value)}>View steps <span className="masca-wizard-step-chevron" aria-hidden="true">⌄</span></button></div>
    <div className="masca-wizard-progress" role="progressbar" aria-label="Sponsor setup progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) * 100 / 3}%` }} /></div>
    <nav id={listID} className="masca-wizard-step-disclosure" data-open={open} aria-label="Sponsor steps" aria-hidden={!open} inert={!open} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); toggle.current?.focus(); } }}><div className="masca-wizard-step-disclosure__inner"><ol className="masca-wizard-steps">{SPONSOR_STEPS.map(({ title }, index) => <li key={title}><button type="button" disabled={busy} tabIndex={open ? 0 : -1} aria-current={index === step ? 'step' : undefined} onClick={() => moveTo(index)}><span className="masca-wizard-step-number" aria-hidden="true">{index < step ? '✓' : index + 1}</span>{title}</button></li>)}</ol></div></nav>
    <div key={step} className="masca-wizard-intro"><h2 ref={heading} tabIndex={-1}>{SPONSOR_STEPS[step].title}</h2><p>{SPONSOR_STEPS[step].description}</p></div>
    {error && <div className="masca-wizard-error" role="alert">{error}</div>}
    {step === 2 && <SponsorReview image={logo?.sizes?.['admin-preview']?.url || logo?.url} />}
  </section>;
}
function SponsorReview({ image }: { image?: string }) {
  const { setStep } = useSponsorEditor();
  const data = useFormFields(([fields]) => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])));
  const name = String(data.name || 'Sponsor name');
  const date = data.date && Number.isFinite(new Date(String(data.date)).getTime()) ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'Australia/Brisbane' }).format(new Date(String(data.date))) : 'No date selected';
  return <div className="masca-sponsor-review">
    <div className="masca-sponsor-review__identity">{image && /* eslint-disable-next-line @next/next/no-img-element */
      <img src={image} alt={name} width={160} height={100} decoding="async" />}
      <div><h3>{name}</h3><p>MASCA sponsor</p></div></div>
    {SPONSOR_STEPS.slice(0, 2).map(({ title }, index) => <section className="masca-overview-section" key={title}><div><h4>{title}</h4>
      <p>{index === 0 ? `${name} · ${date}` : data.logo ? 'Logo selected for the homepage' : 'No logo selected'}</p>
    </div><button type="button" className="masca-wizard-text-button" onClick={() => setStep(index)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></section>)}
  </div>;
}
export function SponsorEditorFooter() {
  const { step, setStep, setError, nextRef, setAttemptedSave } = useSponsorEditor();
  const busy = useFormProcessing();
  const modified = useFormModified();
  const { id } = useDocumentInfo();
  return <footer className="masca-wizard-footer">
    <div className="masca-wizard-save-actions"><Link href="/admin/collections/sponsors" className="masca-action masca-action--secondary">Cancel</Link><span className="masca-save-indicator" role="status">{busy ? 'Saving…' : id && !modified ? 'Saved' : 'Changes go live when saved'}</span></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-secondary" disabled={busy} onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}{step < 2 ? <button type="button" className="masca-wizard-primary" disabled={busy} onClick={() => nextRef.current?.()}>Continue</button> : <div onClickCapture={() => setAttemptedSave(true)}><SaveButton label="Save sponsor" /></div>}</div>
  </footer>;
}
