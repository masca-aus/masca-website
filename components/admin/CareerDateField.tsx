'use client';
import { lazy, Suspense, useId, useRef, useState } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';
import { validCareerDate } from '../../features/careers/careerModel';
import './eventDateRange.css';
const Calendar = lazy(() => import('./EventCalendar'));
export function careerCalendarDate(value?: string | null) {
  if (!value || !validCareerDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function careerCalendarValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const CareerDateField: TextFieldClientComponent = ({ path, field, readOnly }) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({ path, validate: value => validCareerDate(value) || 'Choose a valid date.' });
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const date = careerCalendarDate(value);
  const locked = Boolean(readOnly || disabled);
  const label = typeof field.label === 'string' ? field.label : 'Date';
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className={`field-type masca-event-dates ${field.admin?.className ?? ''}`}>
    <fieldset disabled={locked} className="masca-event-dates__fieldset">
      <legend>{label}{field.required && <span aria-hidden="true"> *</span>}</legend>
      <button ref={trigger} type="button" className="masca-event-dates__summary" aria-label={`Choose ${label.toLowerCase()}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <strong>{date ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : path === 'closes' ? 'Rolling applications' : 'Choose date'}</strong><span className="masca-event-dates__change">{open ? 'Hide calendar' : 'Choose date'}</span>
      </button>
      {open && <div id={id} className="masca-event-dates__calendar" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
        <Suspense fallback={<p role="status">Loading calendar…</p>}><Calendar inline selected={date} calendarStartDay={1} disabled={locked} onChange={day => { if (day && !locked) { setValue(careerCalendarValue(day)); close(); } }} renderCustomHeader={({ monthDate, decreaseMonth, increaseMonth }) => <div className="masca-event-dates__month-heading"><button type="button" aria-label="Previous month" onClick={decreaseMonth}>‹</button><strong>{new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(monthDate)}</strong><button type="button" aria-label="Next month" onClick={increaseMonth}>›</button></div>} /></Suspense>
      </div>}
      {path === 'closes' && value && <button type="button" className="masca-wizard-text-button" onClick={() => { if (!locked) setValue(''); }}>Use rolling applications</button>}
      {showError && <p role="alert" className="masca-event-dates__error">{errorMessage}</p>}
      <p>{path === 'closes' ? 'Optional. Leave empty for rolling applications.' : 'Only change this after reconfirming the role is still available.'}</p>
    </fieldset>
  </div>;
};
