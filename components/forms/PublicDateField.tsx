'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import '../admin/eventDateRange.css';
import './publicDateField.css';
const Calendar=lazy(()=>import('../admin/EventCalendar'));
export function PublicDateField({name,label,required=false,withTime=false,error,hint}:{name:string;label:string;required?:boolean;withTime?:boolean;error?:string;hint?:string}) {
 const [value,setValue]=useState('');const [time,setTime]=useState('12:00');const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setValue('');setTime('12:00');setOpen(false);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 const date=value?new Date(value+'T12:00:00'):null;
 const notify=()=>requestAnimationFrame(()=>root.current?.querySelector('select')?.dispatchEvent(new Event('change',{bubbles:true})));
 return <div ref={root} className="masca-event-dates public-date"><label htmlFor={`date-${name}`} className="block text-body-sm font-bold text-gray-700">{label}{required?' *':''}</label>
 <select className="public-date__native" name={name} aria-label={label} value={value?(withTime?`${value}T${time}`:value):''} required={required} tabIndex={-1} onFocus={()=>trigger.current?.focus()} aria-hidden="true" onChange={()=>{}} onInvalid={e=>{e.preventDefault();setOpen(true);trigger.current?.focus();}}><option value="">Choose a date</option>{value&&<option value={withTime?`${value}T${time}`:value}>{date?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(date):value}{withTime?` at ${time}`:''}</option>}</select>
 <button ref={trigger} id={`date-${name}`} type="button" className="masca-event-dates__summary" aria-expanded={open} aria-invalid={!!error} onClick={()=>setOpen(!open)}><span>{date?new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric'}).format(date):'Choose a date'}</span><CalendarDays size={18} aria-hidden="true"/></button>
 {open&&<div className="masca-event-dates__calendar" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}}}><Suspense fallback={<p role="status">Loading calendar…</p>}><Calendar inline selected={date} calendarStartDay={1} onChange={day=>{if(!day)return;setValue(`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`);setOpen(false);notify();trigger.current?.focus();}} renderCustomHeader={({monthDate,decreaseMonth,increaseMonth})=><div className="masca-event-dates__month-heading"><button type="button" aria-label="Previous month" onClick={decreaseMonth}>‹</button><strong>{new Intl.DateTimeFormat('en-AU',{month:'long',year:'numeric'}).format(monthDate)}</strong><button type="button" aria-label="Next month" onClick={increaseMonth}>›</button></div>}/></Suspense></div>}
 {withTime&&<label className="public-date__time">Time <input type="time" aria-label={`${label} time`} value={time} required={!!value} onChange={e=>{setTime(e.target.value);notify();}}/><span>Local time at the venue</span></label>}
 {!required&&value&&<button type="button" className="mt-2 text-body-sm text-blue-600 underline" onClick={()=>{setValue('');notify();}}>Clear date</button>}
 {hint&&<p className="mt-2 text-body-sm text-gray-700">{hint}</p>}{error&&<p role="alert" className="mt-2 text-body-sm text-red-600">{error}</p>}</div>;
}
