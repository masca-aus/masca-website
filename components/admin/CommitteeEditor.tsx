'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { DefaultEditView, SaveButton, useDocumentInfo, useForm, useFormFields, useFormProcessing, useFormSubmitted, useFormModified } from '@payloadcms/ui';
import type { DocumentViewClientProps } from 'payload';
import { COMMITTEE_STEPS, committeeFieldStep, committeeStepErrors } from '@/features/committee/committeeEditor';
import { useMediaPreview } from './useEventPoster';
import { COMMITTEE_DEPARTMENT_OPTIONS } from '@/utils/committeeDepartments';
import './eventEditor.css';
import './committeeEditor.css';

const Context = createContext<{ step: number; setStep: (step: number) => void; attemptedSave: boolean; setAttemptedSave: (value: boolean) => void; error: string; setError: (error: string) => void; nextRef: React.RefObject<(() => void) | null> } | null>(null);
function useCommitteeEditor() { const value = useContext(Context); if (!value) throw new Error('Committee editor is missing'); return value; }

export function CommitteeEditorView(props: DocumentViewClientProps) {
  const { id } = useDocumentInfo();
  const [step, setStep] = useState(id ? 3 : 0);
  const [error, setError] = useState('');
  const [attemptedSave, setAttemptedSave] = useState(false);
  const nextRef = useRef<(() => void) | null>(null);
  return <Context.Provider value={{ step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave }}>
    <div className="masca-event-editor masca-committee-editor" data-step={step} onSubmitCapture={event => {
      // A media drawer has its own form and must keep its native submit behaviour.
      if (!(event.target instanceof HTMLFormElement) || !event.target.matches('.collection-edit--committee > form')) return;
      if (step < 3) {
        event.preventDefault(); event.stopPropagation(); nextRef.current?.();
      } else setAttemptedSave(true);
    }}><DefaultEditView {...props} /></div>
  </Context.Provider>;
}
export function CommitteeSaveControl() { return null; }

export function CommitteeEditorHeader() {
  const { step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave } = useCommitteeEditor();
  const { getData, dispatchFields, setSubmitted } = useForm();
  const portrait = useMediaPreview(step, 'portrait', 3);
  const busy = useFormProcessing();
  const submitted = useFormSubmitted();
  const firstError = useFormFields(([fields]) => Object.keys(fields).find(key => fields[key].valid === false));
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listID = useId();
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (attemptedSave && submitted && firstError && !busy) { setStep(committeeFieldStep(firstError)); setError('Check the highlighted field before saving.'); setAttemptedSave(false); }
  }, [attemptedSave, firstError, submitted, busy, setStep, setError, setAttemptedSave]);
  const moveTo = (target: number) => {
    if (busy) return;
    setOpen(false);
    setAttemptedSave(false);
    if (target > step) {
      for (let index = 0; index < target; index++) {
        const errors = committeeStepErrors(getData(), index);
        if (Object.keys(errors).length) {
          dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
          setSubmitted(true); setStep(index); setError('Complete the highlighted fields to continue.'); heading.current?.focus(); return;
        }
      }
    }
    setError(''); setStep(target); heading.current?.focus();
  };
  useEffect(() => {
    nextRef.current = () => moveTo(Math.min(step + 1, 3));
    return () => { nextRef.current = null; };
  });
  return <section className="masca-wizard-header" aria-label="Committee editor">
    <div className="masca-wizard-heading-row"><div className="masca-wizard-progress-label"><span className="masca-wizard-badge">Committee</span><span className="masca-wizard-count">Step {step + 1} of 4 · {COMMITTEE_STEPS[step].title}</span></div><button ref={toggle} type="button" className="masca-wizard-text-button" aria-expanded={open} aria-controls={listID} onClick={() => setOpen(value => !value)}>View steps <span className="masca-wizard-step-chevron" aria-hidden="true">⌄</span></button></div>
    <div className="masca-wizard-progress" role="progressbar" aria-label="Committee setup progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) * 25}%` }} /></div>
    <nav id={listID} className="masca-wizard-step-disclosure" data-open={open} aria-label="Committee steps" aria-hidden={!open} inert={!open} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); toggle.current?.focus(); } }}><div className="masca-wizard-step-disclosure__inner"><ol className="masca-wizard-steps">{COMMITTEE_STEPS.map(({ title }, index) => <li key={title}><button type="button" disabled={busy} tabIndex={open ? 0 : -1} aria-current={index === step ? 'step' : undefined} onClick={() => moveTo(index)}><span className="masca-wizard-step-number" aria-hidden="true">{index < step ? '✓' : index + 1}</span>{title}</button></li>)}</ol></div></nav>
    <div key={step} className="masca-wizard-intro"><h2 ref={heading} tabIndex={-1}>{COMMITTEE_STEPS[step].title}</h2><p>{COMMITTEE_STEPS[step].description}</p></div>
    {error && <div className="masca-wizard-error" role="alert">{error}</div>}
    {step === 3 && <CommitteeReview image={portrait?.sizes?.['admin-preview']?.url || portrait?.url} />}
  </section>;
}
function CommitteeReview({ image }: { image?: string }) {
  const { setStep } = useCommitteeEditor();
  const data = useFormFields(([fields]) => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])));
  const value = (key: string) => typeof data[key] === 'string' && data[key] ? String(data[key]) : 'Not provided';
  return <div className="masca-committee-review">
    <div className="masca-committee-review__identity">{image && /* eslint-disable-next-line @next/next/no-img-element */
      <img src={image} alt={value('name')} width={96} height={120} decoding="async" />}
      <div><h3>{value('name')}</h3><p>{value('role')} · {value('year')}</p></div></div>
    {COMMITTEE_STEPS.slice(0, 3).map(({ title }, index) => <section className="masca-overview-section" key={title}><div><h4>{title}</h4>
      {index === 0 && <p>{[data.university, data.course].filter(Boolean).join(' · ') || 'No university or course provided'}</p>}
      {index === 1 && <p>{COMMITTEE_DEPARTMENT_OPTIONS.find(option => option.value === data.department)?.label || value('department')} · {value('year')}</p>}
      {index === 2 && <><p>{data.portrait ? 'Portrait selected' : 'No portrait selected'}</p>{data.bio ? <p>{value('bio')}</p> : null}{data.linkedin_url ? <p>{value('linkedin_url')}</p> : null}</>}
    </div><button type="button" className="masca-wizard-text-button" onClick={() => setStep(index)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></section>)}
  </div>;
}
export function CommitteeEditorFooter() {
  const { step, setStep, setError, nextRef, setAttemptedSave } = useCommitteeEditor();
  const busy = useFormProcessing();
  const modified = useFormModified();
  const { id } = useDocumentInfo();
  return <footer className="masca-wizard-footer">
    <div className="masca-wizard-save-actions"><Link href="/admin/collections/committee" className="masca-action masca-action--secondary">Cancel</Link><span className="masca-save-indicator" role="status">{busy ? 'Saving…' : id && !modified ? 'Saved' : 'Changes go live when saved'}</span></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-secondary" disabled={busy} onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}{step < 3 ? <button type="button" className="masca-wizard-primary" disabled={busy} onClick={() => nextRef.current?.()}>Continue</button> : <div onClickCapture={() => setAttemptedSave(true)}><SaveButton label="Save member" /></div>}</div>
  </footer>;
}
