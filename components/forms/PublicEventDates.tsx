"use client";

import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";
import { CalendarDays } from "lucide-react";
import { eventDate, eventTime, sameEventDay, withEventDay, withEventTime } from "@/features/events/eventDates";
import "../admin/eventDateRange.css";
import "./publicEventDates.css";

const Calendar = lazy(() => import("../admin/EventCalendar"));
const formatDay = (value: Date | null) => value ? new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(value) : "Choose date";
const localValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export function PublicEventDates({ startError, endError }: { startError?: string; endError?: string }) {
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [range, setRange] = useState(false);
  const [endTimeEnabled, setEndTimeEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [clockError, setClockError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const startDay = eventDate(startValue);
  const endDay = eventDate(endValue);
  const endClock = eventTime(endDay) || "17:00";
  const incomplete = range && !endDay;

  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => { setStartValue(""); setEndValue(""); setRange(false); setEndTimeEnabled(false); setOpen(false); setClockError(""); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  const notify = () => requestAnimationFrame(() => {
    root.current?.querySelectorAll("select").forEach(select => select.dispatchEvent(new Event("change", { bubbles: true })));
  });
  const closeCalendar = () => { setOpen(false); toggle.current?.focus(); };
  const changeMode = (isRange: boolean) => {
    setRange(isRange);
    setClockError("");
    if (isRange) { setEndTimeEnabled(false); setOpen(true); }
    else { setEndValue(""); setOpen(false); }
    notify();
  };
  const chooseDates = (first: Date | null, last: Date | null) => {
    if (!first) return;
    const nextStart = withEventDay(first, startValue, "09:00");
    const nextEnd = range && last ? withEventDay(last, endValue, endTimeEnabled ? endClock : "17:00") : null;
    if (!nextStart || (range && last && !nextEnd)) {
      setClockError("That time does not exist on this date because the clocks change. Choose another time.");
      return;
    }
    setClockError("");
    setStartValue(localValue(nextStart));
    if (range) setEndValue(nextEnd ? localValue(nextEnd) : "");
    else if (endTimeEnabled) {
      const nextOptionalEnd = withEventTime(nextStart, endClock);
      setEndValue(nextOptionalEnd && nextOptionalEnd >= nextStart ? localValue(nextOptionalEnd) : localValue(nextStart));
    }
    notify();
  };
  const changeTime = (which: "start" | "end", value: string) => {
    const day = which === "start" ? startDay : range ? endDay : startDay;
    if (!day || !value) return;
    const next = withEventTime(day, value);
    if (!next) { setClockError("That time does not exist on this date because the clocks change. Choose another time."); return; }
    setClockError("");
    if (which === "start") {
      setStartValue(localValue(next));
      if (!range && endTimeEnabled && endDay && sameEventDay(startDay, endDay) && next > endDay) setEndValue(localValue(next));
    } else setEndValue(localValue(next));
    notify();
  };
  const header = ({ monthDate, decreaseMonth, increaseMonth }: ReactDatePickerCustomHeaderProps) => <div className="masca-event-dates__month-heading">
    <button type="button" aria-label="Previous month" onClick={decreaseMonth}>‹</button>
    <strong>{new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(monthDate)}</strong>
    <button type="button" aria-label="Next month" onClick={increaseMonth}>›</button>
  </div>;

  return <div ref={root} className="masca-event-dates public-event-dates md:col-span-2">
    <fieldset className="masca-event-dates__fieldset">
      <legend>Event dates <span aria-hidden="true">*</span></legend>
      <div className="masca-event-dates__modes" aria-label="Event duration">
        <label><input type="radio" name={`${id}-mode`} checked={!range} onChange={() => changeMode(false)} />One day</label>
        <label><input type="radio" name={`${id}-mode`} checked={range} onChange={() => changeMode(true)} />Date range</label>
      </div>
      <button ref={toggle} type="button" id="event-start-date" className="masca-event-dates__summary" data-invalid={Boolean(startError || endError || clockError)} aria-describedby={`${id}-start-error ${id}-end-error`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => setOpen(value => !value)}>
        <span><small>{range ? "Start date" : "Date"}</small><strong>{formatDay(startDay)}</strong></span>
        {range && <><span aria-hidden="true">→</span><span><small>End date</small><strong>{formatDay(endDay)}</strong></span></>}
        <span className="masca-event-dates__change">{open ? "Hide calendar" : "Change dates"}</span><CalendarDays size={18} aria-hidden="true" />
      </button>
      <select className="public-event-dates__native" id="event-start-date-value" name="startDate" aria-label="Start date" required value={startValue} onChange={() => {}} onInvalid={event => { event.preventDefault(); setOpen(true); toggle.current?.focus(); }}>
        <option value="">Choose a start date</option>{startValue && <option value={startValue}>{formatDay(startDay)} at {eventTime(startDay)}</option>}
      </select>
      <select className="public-event-dates__native" id="event-end-date-value" name="endDate" aria-label="End date" required={range} value={range || endTimeEnabled ? endValue : ""} onChange={() => {}} onInvalid={event => { event.preventDefault(); setOpen(true); toggle.current?.focus(); }}>
        <option value="">Choose an end date</option>{endValue && (range || endTimeEnabled) && <option value={endValue}>{formatDay(endDay)} at {eventTime(endDay)}</option>}
      </select>
      <p id={`${id}-start-error`} className="masca-event-dates__error" role={startError ? "alert" : undefined} hidden={!startError}>{startError}</p>
      <p id="event-end-date" className="masca-event-dates__error" role={endError ? "alert" : undefined} hidden={!endError}>{endError}</p>
      {clockError && <p role="alert" className="masca-event-dates__error">{clockError}</p>}
      {open && <div id={`${id}-calendar`} className="masca-event-dates__calendar" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeCalendar(); } }}>
        <p id={`${id}-hint`}>{range ? "Choose the first and last day of your event." : "Choose the day of your event."}</p>
        <Suspense fallback={<p role="status">Loading calendar…</p>}>
          {range
            ? <Calendar inline selectsRange startDate={startDay} endDate={endDay} selected={startDay} onChange={([first, last]) => chooseDates(first, last)} renderCustomHeader={header} calendarStartDay={1} ariaDescribedBy={`${id}-hint`} />
            : <Calendar inline selected={startDay} onChange={day => { chooseDates(day, null); closeCalendar(); }} renderCustomHeader={header} calendarStartDay={1} ariaDescribedBy={`${id}-hint`} />}
        </Suspense>
        <div className="masca-event-dates__calendar-actions"><span role="status">{incomplete ? "Choose an end date to complete the range." : startDay ? range ? `${formatDay(startDay)} – ${formatDay(endDay)}` : formatDay(startDay) : "No date selected"}</span><button type="button" className="masca-wizard-text-button" onClick={closeCalendar} disabled={!startDay || incomplete}>Done</button></div>
      </div>}
      <div className="masca-event-dates__times">
        <label htmlFor={`${id}-start-time`}>Start time<input id={`${id}-start-time`} type="time" required value={eventTime(startDay) || "09:00"} disabled={!startDay} onChange={event => changeTime("start", event.target.value)} /></label>
        {(range || endTimeEnabled) && <label htmlFor={`${id}-end-time`}>End time<input id={`${id}-end-time`} type="time" required={range} value={eventTime(endDay) || endClock} disabled={range ? !endDay : !startDay} onChange={event => changeTime("end", event.target.value)} /></label>}
      </div>
      {!range && <label className="masca-event-dates__optional"><input type="checkbox" checked={endTimeEnabled} disabled={!startDay} onChange={event => {
        setEndTimeEnabled(event.target.checked);
        if (!event.target.checked) setEndValue("");
        else if (startDay) {
          const optionalEnd = withEventTime(startDay, endClock);
          setEndValue(optionalEnd && optionalEnd >= startDay ? localValue(optionalEnd) : localValue(startDay));
        }
        notify();
      }} />Add an end time <span>(optional)</span></label>}
      <p className="masca-event-dates__timezone">Times follow the selected state’s local timezone.</p>
    </fieldset>
  </div>;
}
