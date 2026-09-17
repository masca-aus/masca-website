'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { DefaultEditView, SaveDraftButton, PublishButton, useDocumentInfo, useForm, useFormFields, useFormProcessing, useFormSubmitted, useFormModified } from '@payloadcms/ui';
import type { DocumentViewClientProps } from 'payload';
import { CAREER_STEPS, careerFieldStep, careerStepErrors } from '@/features/careers/careerEditor';
import { JOB_TYPE_LABEL, WORK_MODE_LABEL, STUDY_LEVEL_LABEL, INTERNATIONAL_LABEL } from '@/utils/careers';
import './eventEditor.css';
import './careerEditor.css';

const Context = createContext<{ step: number; setStep: (step: number) => void; attemptedSave: boolean; setAttemptedSave: (value: boolean) => void; error: string; setError: (error: string) => void; nextRef: React.RefObject<(() => void) | null> } | null>(null);
function useCareerEditor() { const value = useContext(Context); if (!value) throw new Error('Career editor is missing'); return value; }

export function CareerEditorView(props: DocumentViewClientProps) {
  const { id } = useDocumentInfo();
  const [step, setStep] = useState(id ? 3 : 0);
  const [error, setError] = useState('');
  const [attemptedSave, setAttemptedSave] = useState(false);
  const nextRef = useRef<(() => void) | null>(null);
  return <Context.Provider value={{ step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave }}>
    <div className="masca-event-editor masca-career-editor" data-step={step} onSubmitCapture={event => {
      // A media drawer has its own form and must keep its native submit behaviour.
      if (!(event.target instanceof HTMLFormElement) || !event.target.matches('.collection-edit--careers > form')) return;
      if (step < 3) {
        event.preventDefault(); event.stopPropagation(); nextRef.current?.();
      } else setAttemptedSave(true);
    }}><DefaultEditView {...props} /></div>
  </Context.Provider>;
}
export function CareerSaveControl() { return null; }
export function CareerPublishControl() { return null; }

export function CareerEditorHeader() {
  const { step, setStep, error, setError, nextRef, attemptedSave, setAttemptedSave } = useCareerEditor();
  const busy = useFormProcessing();
  const submitted = useFormSubmitted();
  const firstError = useFormFields(([fields]) => Object.keys(fields).find(key => fields[key].valid === false));
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listID = useId();
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (attemptedSave && submitted && firstError && !busy) { setStep(careerFieldStep(firstError)); setError('Check the highlighted field before saving.'); setAttemptedSave(false); }
  }, [attemptedSave, firstError, submitted, busy, setStep, setError, setAttemptedSave]);
  const moveTo = (target: number) => {
    if (busy) return;
    setOpen(false);
    setAttemptedSave(false);
    setError(''); setStep(target); heading.current?.focus();
  };
  useEffect(() => {
    nextRef.current = () => moveTo(Math.min(step + 1, 3));
    return () => { nextRef.current = null; };
  });
  return <section className="masca-wizard-header" aria-label="Career editor">
    <div className="masca-wizard-heading-row"><div className="masca-wizard-progress-label"><span className="masca-wizard-badge">Career</span><span className="masca-wizard-count">Step {step + 1} of 4 · {CAREER_STEPS[step].title}</span></div><button ref={toggle} type="button" className="masca-wizard-text-button" aria-expanded={open} aria-controls={listID} onClick={() => setOpen(value => !value)}>View steps <span className="masca-wizard-step-chevron" aria-hidden="true">⌄</span></button></div>
    <div className="masca-wizard-progress" role="progressbar" aria-label="Career setup progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) * 25}%` }} /></div>
    <nav id={listID} className="masca-wizard-step-disclosure" data-open={open} aria-label="Career steps" aria-hidden={!open} inert={!open} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); toggle.current?.focus(); } }}><div className="masca-wizard-step-disclosure__inner"><ol className="masca-wizard-steps">{CAREER_STEPS.map(({ title }, index) => <li key={title}><button type="button" disabled={busy} tabIndex={open ? 0 : -1} aria-current={index === step ? 'step' : undefined} onClick={() => moveTo(index)}><span className="masca-wizard-step-number" aria-hidden="true">{index < step ? '✓' : index + 1}</span>{title}</button></li>)}</ol></div></nav>
    <div key={step} className="masca-wizard-intro"><h2 ref={heading} tabIndex={-1}>{CAREER_STEPS[step].title}</h2><p>{CAREER_STEPS[step].description}</p></div>
    {error && <div className="masca-wizard-error" role="alert">{error}</div>}
    {step === 3 && <CareerReview />}
  </section>;
}
function CareerReview() {
  const { setStep } = useCareerEditor();
  const data = useFormFields(([fields]) => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])));
  const value = (key: string) => Array.isArray(data[key]) ? data[key].join(', ') : typeof data[key] === 'string' && data[key] ? String(data[key]) : 'Not provided';
  const label = (key: string, labels: Record<string, string>) => labels[String(data[key])] || value(key);
  const studyLevels = Array.isArray(data.studyLevels) && data.studyLevels.length ? data.studyLevels.map(level => STUDY_LEVEL_LABEL[level as keyof typeof STUDY_LEVEL_LABEL] || level).join(', ') : 'Not provided';
  return <div className="masca-career-review">
    <div className="masca-career-review__identity"><h3>{value('title')}</h3><p>{value('company')}</p></div>
    {CAREER_STEPS.slice(0, 3).map(({ title }, index) => <section className="masca-overview-section" key={title}><div><h4>{title}</h4>
      {index === 0 && <><p>{[data.type && label('type', JOB_TYPE_LABEL), data.industry].filter(Boolean).join(' · ') || 'No role details provided'}</p><p>Company website: {value('companyWebsite')}</p><p>Logo URL: {value('logoUrl')}</p></>}
      {index === 1 && <><p>{[data.city, data.state, data.country, data.workMode && label('workMode', WORK_MODE_LABEL)].filter(Boolean).join(' · ') || 'No location provided'}</p><p>{value('eligibility')}</p><p>Study levels: {studyLevels}</p><p>International students: {label('international', INTERNATIONAL_LABEL)}</p></>}
      {index === 2 && <><p>{value('applyUrl')}</p><p>{data.closes ? `Applications close ${value('closes')}` : 'Rolling applications'}</p><p>{value('description')}</p><p>Featured: {data.featured ? 'Yes' : 'No'}</p><p>Tags: {value('tags')}</p><p>Listed date: {value('added')}</p>{data.pay ? <p>Pay: {value('pay')}</p> : null}{data.internalNotes ? <p className="masca-career-private-note">Private notes: {value('internalNotes')}</p> : null}</>}
    </div><button type="button" className="masca-wizard-text-button" onClick={() => setStep(index)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></section>)}
  </div>;
}
export function CareerEditorFooter() {
  const { step, setStep, setError, nextRef, setAttemptedSave } = useCareerEditor();
  const { getData, dispatchFields, setSubmitted } = useForm();
  const busy = useFormProcessing();
  const modified = useFormModified();
  const { id } = useDocumentInfo();
  function validatePublication(event: React.MouseEvent) {
    for (let index = 0; index < 3; index++) {
      const errors = careerStepErrors(getData(), index);
      if (Object.keys(errors).length) {
        event.preventDefault(); event.stopPropagation();
        dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
        setSubmitted(true); setStep(index); setError('Complete the highlighted fields before publishing.'); return;
      }
    }
    setAttemptedSave(true);
  }
  return <footer className="masca-wizard-footer">
    <div className="masca-wizard-save-actions"><Link href="/admin/collections/careers" className="masca-action masca-action--secondary">Cancel</Link><div onClickCapture={() => setAttemptedSave(false)}><SaveDraftButton /></div><span className="masca-save-indicator" role="status">{busy ? 'Saving…' : id && !modified ? 'Saved' : 'Drafts stay private until published'}</span></div>
    <div>{step > 0 && <button type="button" className="masca-wizard-secondary" disabled={busy} onClick={() => { setError(''); setStep(step - 1); }}>Back</button>}{step < 3 ? <button type="button" className="masca-wizard-primary" disabled={busy} onClick={() => nextRef.current?.()}>Continue</button> : <div onClickCapture={validatePublication}><PublishButton label="Publish opportunity" /></div>}</div>
  </footer>;
}
