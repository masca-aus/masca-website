'use client';
import { useRouter } from 'next/navigation';
import { JOB_TYPE_LABEL, WORK_MODE_LABEL } from '@/utils/careers';
import { useRef, useState } from 'react';
import { useDocumentInfo, useForm, useFormModified } from '@payloadcms/ui';
import './listingTools.css';
export function ListingTools({ collection, review = false }: {collection:'events'|'careers';review?:boolean}) {
 const router=useRouter();
 const {id,hasSavePermission,data}=useDocumentInfo();
 const {getData}=useForm();
 const modified=useFormModified();
 const dialog=useRef<HTMLDialogElement>(null);
 const [active,setActive]=useState(false);
 const [mode,setMode]=useState<'preview'|'review'>('preview');
 const [snapshot,setSnapshot]=useState<Record<string,unknown>>({});
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 function open(next:'preview'|'review') {setActive(true);setSnapshot(getData());setMode(next);setNote(String(data?.reviewNotes||''));setError('');dialog.current?.showModal();}
 function close(){setActive(false);dialog.current?.close();trigger.current?.focus();}
 async function action(action:string) {
  setBusy(true);setError('');
  try {
   const response=await fetch(`/api/${collection}/${id}/listing-action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,note})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.message||'Unable to complete this action.');
   if(action==='duplicate')router.push(`/admin/collections/${collection}/${result.id}`);else window.location.reload();
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');setBusy(false);}
 }
 const formatDate=(key:string)=>{const value=snapshot[key];if(typeof value!=='string'||!value)return '';const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});};
 const text=(key:string)=>typeof snapshot[key]==='string'?String(snapshot[key]):'';
 return <div className="masca-listing-tools">
  {review ? <><button ref={trigger} type="button" className="masca-action masca-action--secondary" onClick={()=>open('preview')}>Preview</button>
   {id && data?.submittedForReview && hasSavePermission!==false && <button type="button" className="masca-action masca-action--secondary" disabled={modified||busy} title={modified?'Save your draft before recording a review decision.':undefined} onClick={()=>open('review')}>Needs changes</button>}
   {data?.needsChanges && <aside><strong>Needs changes</strong><p>{String(data.reviewNotes||'')}</p></aside>}
  </> : id && hasSavePermission!==false && <details><summary aria-label="Listing actions">•••</summary><button type="button" disabled={busy||modified} onClick={()=>action('duplicate')}>Duplicate as draft</button><small>{modified?'Save changes before duplicating.':'Copies saved content. Dates and private submitter details are cleared.'}</small></details>}
  {error && <p role="alert">{error}</p>}
  <dialog ref={dialog} className="masca-listing-dialog" onCancel={e=>{e.preventDefault();close();}} aria-label={mode==='preview'?'Private listing preview':'Request changes'}>
   <header><strong>{mode==='preview'?'Draft preview · Not published':'Needs changes'}</strong><button type="button" onClick={close} aria-label="Close">×</button></header>
   {active && (mode==='preview'?<article className="masca-private-preview"><h2>{text('title')||'Untitled'}</h2><p>{text(collection==='events'?'organisation':'company')}</p><p>{[text('city'),text('venue'),text('state'),text('country')].filter(Boolean).join(' · ')}</p>{collection==='events'?<p>{formatDate('startDate')} {text('endDate')&&`— ${formatDate('endDate')}`}</p>:<p>{text('closes')?`Applications close ${formatDate('closes')}`:'Rolling applications'}</p>}{collection==='careers' && <p>{[JOB_TYPE_LABEL[text('type') as keyof typeof JOB_TYPE_LABEL],WORK_MODE_LABEL[text('workMode') as keyof typeof WORK_MODE_LABEL]].filter(Boolean).join(' · ')}</p>}<p className="masca-private-preview__description">{text('description')||'Add a description to complete this listing.'}</p><span className="masca-private-preview__cta">{collection==='events'?'Register':'Apply'}</span><p><small>Preview only. Links are disabled and private notes are not shown.</small></p></article>:<><p>Explain what needs fixing. This note stays internal and the submission remains private.</p><label htmlFor={`${collection}-review-note`}>Review note *</label><textarea id={`${collection}-review-note`} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} /><button type="button" disabled={busy||!note.trim()} onClick={()=>action('needs-changes')}>{busy?'Saving…':'Save review note'}</button>{error&&<p role="alert">{error}</p>}</>)}
  </dialog>
 </div>;
}
