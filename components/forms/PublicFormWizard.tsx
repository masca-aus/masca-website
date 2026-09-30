'use client';
import { Children, useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import Button from '@/components/Button';
import './publicFormWizard.css';
type ResponseState={ok:boolean;fieldErrors?:Record<string,string[]>}|null;
export function PublicFormWizard({children,steps,action,onSubmit,innerRef,pending,response,onChange}: {
 children:ReactNode;steps:string[];action:string;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;innerRef:RefObject<HTMLFormElement|null>;pending:boolean;response:ResponseState;onChange?:()=>void;
}) {
 const [step,setStep]=useState(0);
 const [summary,setSummary]=useState<[string,string][]>([]);
 const heading=useRef<HTMLHeadingElement>(null);
 const parts=Children.toArray(children);
 const titles=[...steps,'Review & submit'];
 function move(next:number) {setStep(next);requestAnimationFrame(()=>heading.current?.focus());}
 function validate(index:number) {
  const group=innerRef.current?.querySelector(`[data-form-step="${index}"]`);
  const fields=Array.from(group?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')??[]);
  const levels=fields.filter(field=>field.name==='studyLevels' && field instanceof HTMLInputElement) as HTMLInputElement[];
  if(levels.length)levels[0].setCustomValidity(levels.some(field=>field.checked)?'':'Choose at least one study level.');
  const invalid=fields.find(field=>!field.checkValidity());
  if(invalid) {move(index);requestAnimationFrame(()=>invalid.reportValidity());return false;}
  return true;
 }
 function review() {
  const form=innerRef.current;if(!form)return;
  const rows:[string,string][]=[];
  for(const el of Array.from(form.elements)) {
   if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement)||!el.name||el.name==='accuracyConfirmed')continue;
   if(el instanceof HTMLInputElement && el.type==='checkbox' && !el.checked)continue;
   const label=el.labels?.[0]?.textContent?.trim()||el.getAttribute('aria-label')||el.name;
   const value=el instanceof HTMLSelectElement ? Array.from(el.selectedOptions).map(o=>o.text).join(', ') : el instanceof HTMLInputElement && el.type==='file' ? el.files?.[0]?.name||'' : el.value;
   if(value)rows.push([label,value]);
  }
  setSummary(rows);
 }
 function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();if(pending)return;
  for(let i=0;i<=Math.min(step,steps.length-1);i++) if(!validate(i))return;
  if(step<steps.length) {review();move(step+1);return;}
  onSubmit(event);
 }
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
  if(response?.ok) {setStep(0);setSummary([]);}
  else if(response?.fieldErrors && !(innerRef.current?.contains(document.activeElement) && document.activeElement?.matches("input,select,textarea"))) {
   const name=Object.keys(response.fieldErrors)[0];
   const found=innerRef.current?.elements.namedItem(name);
   const el=found instanceof RadioNodeList?found.item(0):found;
   if(el instanceof HTMLElement) {const index=el.closest<HTMLElement>('[data-form-step]')?.dataset.formStep;if(index)setStep(Number(index));requestAnimationFrame(()=>el.focus());}
  }
  });
  return ()=>cancelAnimationFrame(frame);
 },[response,innerRef]);
 return <form ref={innerRef} action={action} method="post" encType="multipart/form-data" noValidate onChange={onChange} onSubmit={submit} className="public-form-wizard" aria-busy={pending}>
  <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-6 md:p-8">
   <p className="eyebrow text-blue-600">Step {step+1} of {titles.length}</p>
   <h3 ref={heading} tabIndex={-1} className="mt-2 text-blue-600">{titles[step]}</h3>
   <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="Submission progress" aria-valuemin={1} aria-valuemax={titles.length} aria-valuenow={step+1}><div className="h-full rounded-full bg-yellow-500 transition-all duration-300 motion-reduce:transition-none" style={{width:`${(step+1)/titles.length*100}%`}}/></div>
   <p className="mt-4 text-body-sm text-gray-700">Complete the details, check your submission, then send it to MASCA for review.</p>
  </div>
  {parts.slice(0,steps.length).map((part,index)=><div key={index} data-form-step={index} hidden={step!==index} className="public-form-wizard__step">{part}</div>)}
  {step===steps.length && <section className="public-form-wizard__step rounded-xl border-2 border-blue-100 p-6 md:p-8"><h3 className="text-blue-600">Check your details</h3><p className="mt-2 text-gray-700">Your submission will be marked “To be reviewed”. It will not appear publicly until the team approves and publishes it.</p><dl className="mt-6 grid gap-5 md:grid-cols-2">{summary.map(([label,value],index)=><div key={index}><dt className="text-body-sm font-bold text-blue-600">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-gray-700">{value}</dd></div>)}</dl></section>}
  <div className="flex flex-wrap items-center gap-5">
   {step>0 && <Button type="button" variant="outline" disabled={pending} onClick={()=>move(step-1)}>Back</Button>}
   {step<steps.length ? <Button type="submit" variant="accent" disabled={pending}>{pending?'Submitting…':'Continue →'}</Button> : parts[steps.length]}
  </div>
 </form>;
}
