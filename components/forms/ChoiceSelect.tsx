'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown,Search} from 'lucide-react';
import type {FormOption} from '@/features/forms/options';
import './choiceSelect.css';
export function ChoiceSelect({label,value,options,onChange,disabled=false,error,required=false,name,id:providedId}:{label:string;value:string;options:FormOption[];onChange:(value:string)=>void;disabled?:boolean;error?:string;required?:boolean;name?:string;id?:string}) {
 const generated=useId();const id=providedId||generated;const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const input=useRef<HTMLSelectElement>(null);
 const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [active,setActive]=useState(-1);
 const available=value&&!options.some(o=>o.value===value)?[{value,label:value},...options]:options;
 const filtered=available.filter(o=>o.label.toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 const choose=(next:string)=>{onChange(next);setOpen(false);trigger.current?.focus();};
 return <div ref={root} className="masca-choice" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <label id={`${id}-label`} htmlFor={id}>{label}{required?' *':''}</label>
  {name&&<select ref={input} className="masca-choice__native" name={name} value={value} required={required} disabled={disabled} tabIndex={-1} onFocus={()=>trigger.current?.focus()} aria-hidden="true" aria-label={label} onChange={e=>onChange(e.target.value)} onInvalid={e=>{e.preventDefault();trigger.current?.focus();setOpen(true);}}><option value="">Choose an option</option>{available.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select>}
  <button ref={trigger} id={id} type="button" role="combobox" aria-expanded={open} aria-activedescendant={open&&active>=0?`${id}-option-${active}`:undefined} aria-controls={`${id}-list`} aria-labelledby={`${id}-label`} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} disabled={disabled} onClick={()=>{setOpen(!open);setQuery('');setActive(-1);}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(Math.max(0,Math.min(filtered.length-1,active+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Escape'){e.preventDefault();setOpen(false);}if(e.key==='Enter'&&open&&active>=0&&filtered[active]){e.preventDefault();choose(filtered[active].value);}}}>
   <span className={value?'':'masca-choice__placeholder'}>{available.find(o=>o.value===value)?.label||'Choose an option'}</span><ChevronDown size={18} aria-hidden="true"/>
  </button>
  {open&&<div className="masca-choice__panel"><div className="masca-choice__search"><Search size={16} aria-hidden="true"/><input aria-label={`Search ${label}`} placeholder="Search options…" value={query} onChange={e=>{setQuery(e.target.value);setActive(-1);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(filtered.length===1)choose(filtered[0].value);}if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}if(e.key==='ArrowDown'){e.preventDefault();root.current?.querySelector<HTMLButtonElement>('[role=option]')?.focus();}}}/></div><div id={`${id}-list`} role="listbox" aria-label={label}>{filtered.map((o,index)=><button type="button" role="option" id={`${id}-option-${index}`} aria-selected={value===o.value} className={index===active?'is-active':''} key={o.value} onClick={()=>choose(o.value)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const buttons=root.current?.querySelectorAll<HTMLButtonElement>('[role=option]');buttons?.[Math.max(0,Math.min(filtered.length-1,index+(e.key==='ArrowDown'?1:-1)))]?.focus();}}}>{o.label}{value===o.value&&<Check size={16} aria-hidden="true"/>}</button>)}{!filtered.length&&<p>No matching options.</p>}</div>{!required&&value&&<button type="button" className="masca-choice__clear" onClick={()=>choose('')}>Clear selection</button>}</div>}
  {error&&<p id={`${id}-error`} role="alert" className="masca-choice__error">{error}</p>}
 </div>;
}
export function PublicChoice({defaultValue='',...props}:Omit<Parameters<typeof ChoiceSelect>[0],'value'|'onChange'> & {defaultValue?:string}) {
 const [value,setValue]=useState(defaultValue);const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>setValue(defaultValue);form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[defaultValue]);
 return <div ref={root}><ChoiceSelect {...props} value={value} onChange={next=>{setValue(next);requestAnimationFrame(()=>root.current?.querySelector('select')?.dispatchEvent(new Event('change',{bubbles:true})));}}/></div>;
}
