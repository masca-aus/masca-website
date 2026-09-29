'use client';

import { lazy, Suspense, useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { ReactDatePickerCustomHeaderProps } from 'react-datepicker';
import type { DateFieldClientComponent, Validate } from 'payload';
import { useField } from '@payloadcms/ui';
import { eventDate, eventTime, sameEventDay, withEventDay, withEventTime } from '@/features/events/eventDates';
import { validateEventStep } from '@/features/events/eventEditor';
import { useEventEditor } from './EventEditorView';
import './eventDateRange.css';

const DatePicker = lazy(() => import('./EventCalendar'));
const validateStart: Validate = value => validateEventStep({ startDate: value }, 1).startDate ?? true;
const validateEnd: Validate = (value, { data }) => validateEventStep({ ...data, endDate: value }, 1).endDate ?? true;
const formatDay = (date: Date | null) => date ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : 'Choose date';

export const EventDateRangeField: DateFieldClientComponent = ({ field, readOnly }) => {
  const start = useField<string | null>({ path: 'startDate', validate: validateStart });
  const end = useField<string | null>({ path: 'endDate', validate: validateEnd });
  const { dateSelectionValidationRef } = useEventEditor();
  const startDay = eventDate(start.value);
  const endDay = eventDate(end.value);
  const [range, setRange] = useState(() => Boolean(startDay && endDay && !sameEventDay(startDay, endDay)));
  const [open, setOpen] = useState(() => !startDay);
  const [endClock, setEndClock] = useState(() => eventTime(endDay) || '17:00');
  const [clockError, setClockError] = useState('');
  const [months, setMonths] = useState(1);
  // Supply the container to the calendar's roving-focus logic. Its ref type predates React 19.
  const calendar = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const disabled = Boolean(readOnly || start.disabled || end.disabled);
  const incomplete = range && !endDay;

  useEffect(() => {
    dateSelectionValidationRef.current = () => ({
      ...(incomplete ? { endDate: 'Choose an end date, or select One day.' } : {}),
      ...(clockError ? { startDate: clockError } : {}),
    });
    return () => { dateSelectionValidationRef.current = null; };
  }, [dateSelectionValidationRef, incomplete, clockError]);

  useEffect(() => {
    if (!calendar.current) return;
    const observer = new ResizeObserver(entries => setMonths(entries[0].contentRect.width >= 620 ? 2 : 1));
    observer.observe(calendar.current);
    return () => observer.disconnect();
  }, []);

  const chooseDates = (first: Date | null, last: Date | null) => {
    if (disabled || !first) return;
    const nextStart = withEventDay(first, start.value);
    const nextEnd = last ? withEventDay(last, end.value, endClock) : null;
    if (!nextStart || (last && !nextEnd)) {
      setClockError('That time does not exist on this date because the clocks change. Choose another time first.');
      return;
    }
    setClockError('');
    start.setValue(nextStart.toISOString());
    end.setValue(nextEnd?.toISOString() ?? null);
  };
  const chooseOneDay = (day: Date | null) => chooseDates(day, endDay ? day : null);
  const changeTime = (which: 'start' | 'end', time: string) => {
    const day = which === 'start' ? startDay : endDay;
    if (!day || !time || disabled) return;
    const next = withEventTime(day, time);
    if (!next) { setClockError('That time does not exist on this date because the clocks change. Choose another time.'); return; }
    setClockError('');
    if (which === 'end') setEndClock(time);
    (which === 'start' ? start : end).setValue(next.toISOString());
  };
  const renderMonthHeader = ({ monthDate, decreaseMonth, increaseMonth, customHeaderCount }: ReactDatePickerCustomHeaderProps) => <div className="masca-event-dates__month-heading">
    <button type="button" aria-label="Previous month" style={{ visibility: customHeaderCount === 0 ? 'visible' : 'hidden' }} onClick={decreaseMonth}>‹</button>
    <strong>{new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(monthDate)}</strong>
    <button type="button" aria-label="Next month" style={{ visibility: customHeaderCount === months - 1 ? 'visible' : 'hidden' }} onClick={increaseMonth}>›</button>
  </div>;
  const closeCalendar = () => { setOpen(false); toggle.current?.focus(); };

  return <div className={`field-type masca-event-dates ${field.admin?.className ?? ''}`}>
    <fieldset disabled={disabled} className="masca-event-dates__fieldset">
      <legend>Event dates <span aria-hidden="true">*</span></legend>
      <div className="masca-event-dates__modes">
        <label><input type="radio" name={`${id}-mode`} checked={!range} onChange={() => { setRange(false); end.setValue(null); setClockError(''); }} />One day</label>
        <label><input type="radio" name={`${id}-mode`} checked={range} onChange={() => { setRange(true); setOpen(true); }} />Date range</label>
      </div>
      <button ref={toggle} type="button" className="masca-event-dates__summary" data-invalid={start.showError || end.showError || Boolean(clockError)} aria-describedby={`${id}-start-error ${id}-end-error`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => setOpen(value => !value)}>
        <span><small>{range ? 'Start date' : 'Date'}</small><strong>{formatDay(startDay)}</strong></span>
        {range && <><span aria-hidden="true">→</span><span><small>End date</small><strong>{formatDay(endDay)}</strong></span></>}
        <span className="masca-event-dates__change">{open ? 'Hide calendar' : 'Change dates'}</span>
      </button>
      <p id={`${id}-start-error`} className="masca-event-dates__error" role={start.showError ? 'alert' : undefined} hidden={!start.showError}>{start.errorMessage}</p>
      <p id={`${id}-end-error`} className="masca-event-dates__error" role={end.showError ? 'alert' : undefined} hidden={!end.showError}>{end.errorMessage}</p>
      {clockError && <p role="alert" className="masca-event-dates__error">{clockError}</p>}
      <div ref={calendar}>
        {open && <div id={`${id}-calendar`} className="masca-event-dates__calendar" onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCalendar(); }
        }}>
          <p id={`${id}-hint`}>{range ? 'Choose the first and last day of your event.' : 'Choose the day of your event.'}</p>
          <Suspense fallback={<p role="status">Loading calendar…</p>}>
          {range ? <DatePicker containerRef={calendar as RefObject<HTMLDivElement>} inline selectsRange startDate={startDay} endDate={endDay} selected={startDay} onChange={([first, last]) => chooseDates(first, last)} monthsShown={months} renderCustomHeader={renderMonthHeader} calendarStartDay={1} disabled={disabled} ariaDescribedBy={`${id}-hint`} />
            : <DatePicker containerRef={calendar as RefObject<HTMLDivElement>} inline selected={startDay} onChange={chooseOneDay} monthsShown={months} renderCustomHeader={renderMonthHeader} calendarStartDay={1} disabled={disabled} ariaDescribedBy={`${id}-hint`} />}
          </Suspense>
          <div className="masca-event-dates__calendar-actions">
            <span role="status">{incomplete ? 'Choose an end date to complete the range.' : startDay ? (range ? `${formatDay(startDay)} – ${formatDay(endDay)}` : formatDay(startDay)) : 'No date selected'}</span>
            <button type="button" className="masca-wizard-text-button" onClick={closeCalendar} disabled={!startDay || incomplete}>Done</button>
          </div>
        </div>}
      </div>
      <div className="masca-event-dates__times">
        <label htmlFor={`${id}-start-time`}>Start time<input id={`${id}-start-time`} type="time" required value={eventTime(startDay) || '09:00'} disabled={!startDay || disabled} onChange={event => changeTime('start', event.target.value)} /></label>
        {(range || endDay) && <label htmlFor={`${id}-end-time`}>End time<input id={`${id}-end-time`} type="time" required value={eventTime(endDay) || endClock} disabled={!endDay || disabled} onChange={event => changeTime('end', event.target.value)} /></label>}
      </div>
      {!range && <label className="masca-event-dates__optional"><input type="checkbox" checked={Boolean(endDay)} disabled={!startDay || disabled} onChange={event => {
        if (!event.target.checked) { end.setValue(null); return; }
        if (startDay) {
          const next = withEventTime(startDay, endClock);
          end.setValue(next && next >= startDay ? next.toISOString() : startDay.toISOString());
        }
      }} />Add an end time <span>(optional)</span></label>}
      <p className="masca-event-dates__timezone">Times are entered in your device timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
    </fieldset>
  </div>;
};
