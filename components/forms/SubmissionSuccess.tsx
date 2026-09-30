'use client';
import { useEffect, useRef } from 'react';
import Button from '@/components/Button';
import './submissionSuccess.css';
export function SubmissionSuccess({open,message,href,label,onClose}:{open:boolean;message:string;href:string;label:string;onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const element=dialog.current;
  if(!open||!element)return;
  const previous=document.activeElement as HTMLElement|null;
  element.showModal();
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{element.close();document.body.style.overflow=overflow;previous?.focus();};
 },[open]);
 return <dialog ref={dialog} className="submission-success" aria-labelledby="submission-success-title" aria-describedby="submission-success-message" onCancel={onClose}>
  <div className="p-8 text-center md:p-10">
   <div aria-hidden="true" className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-50 text-3xl text-blue-600">✓</div>
   <h2 id="submission-success-title" className="text-blue-600">Submitted for review</h2>
   <p id="submission-success-message" className="mt-4 text-gray-700">{message}</p>
   <p className="mt-3 text-body-sm text-gray-700">You’re all set. Your submission will appear on the website once approved and published.</p>
   <div className="mt-8 flex flex-wrap justify-center gap-4"><Button href={href} variant="accent">{label}</Button><Button type="button" variant="ghost" onClick={onClose}>Close</Button></div>
  </div>
 </dialog>;
}
