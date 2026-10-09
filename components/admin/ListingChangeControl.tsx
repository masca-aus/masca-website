'use client';
import {useEffect,useRef,useState} from 'react';
import {useDocumentInfo,useFormModified} from '@payloadcms/ui';
type Change={id:number;message:string;status:'open'|'resolved';createdAt:string;resolution?:string;resolvedAt?:string;resolvedBy?:string;pendingOutcome?:string};
type Preview={to:string;subject:string;html:string;version:string;outcome?:string};
export function ListingChangeControl({collection}:{collection:'events'|'careers'}){
 const {id,hasSavePermission,data}=useDocumentInfo();const modified=useFormModified();
 const [requests,setRequests]=useState<Change[]>([]);const [resolution,setResolution]=useState('');const [confirmed,setConfirmed]=useState(false);
 const [preview,setPreview]=useState<Preview|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [loaded,setLoaded]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const endpoint=`/api/${collection}/${id}/change-requests`;
 useEffect(()=>{if(!id||hasSavePermission===false)return;let alive=true;fetch(endpoint).then(async response=>{if(!response.ok)throw Error('Unable to load change requests.');return response.json();}).then(result=>{if(alive){setRequests(result.requests || []);const pending=result.requests?.find((row:Change)=>row.status==='open')?.pendingOutcome;if(pending)setResolution(pending);setLoaded(true);}}).catch(error=>{if(alive)setError(error.message);});return()=>{alive=false;};},[endpoint,id,hasSavePermission,data?.updatedAt]);
 const open=requests.find(row=>row.status==='open');
 if(!id||hasSavePermission===false)return null;
 async function action(action:'preview'|'resolve'){
  if(!open)return;setBusy(true);setError('');
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,requestID:open.id,resolution,confirmedReviewed:confirmed,version:preview?.version})});const result=await response.json();if(!response.ok)throw Error(result.message);
   if(action==='preview'){setPreview(result);if(result.outcome)setResolution(result.outcome);dialog.current?.showModal();}else window.location.reload();
  }catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 function close(){if(busy)return;dialog.current?.close();setPreview(null);trigger.current?.focus();}
 return <section className="masca-listing-email" aria-label="Submission change requests" style={{display:'block'}}>
  <h3>{open?'Change requested':'Change request history'}</h3>
  {!loaded&&!error&&<p>Loading change requests…</p>}
  {loaded&&!requests.length&&<p>No change requests received.</p>}
  {open&&<><p>Received {new Date(open.createdAt).toLocaleString('en-AU')}</p><blockquote style={{whiteSpace:'pre-wrap'}}>{open.message}</blockquote><p>Review the request and save any listing changes first. Resolving this request does not edit the listing.</p>
   <label htmlFor={`change-outcome-${id}`}>Outcome to send to the submitter</label>
   <textarea id={`change-outcome-${id}`} value={resolution} maxLength={4000} rows={4} onChange={event=>{setResolution(event.target.value);setConfirmed(false);}} style={{display:'block',width:'100%',margin:'12px 0'}}/>
   <label><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/> I reviewed this request and saved any required listing changes.</label>
   {modified&&<p>Save your listing changes before previewing the confirmation.</p>}
   <p><button ref={trigger} type="button" className="masca-action" disabled={busy||modified||!confirmed||resolution.trim().length<10} onClick={()=>action('preview')}>Preview resolution email</button></p>
  </>}
  {requests.filter(row=>row.status==='resolved').map(row=><details key={row.id}><summary>Resolved {row.resolvedAt?new Date(row.resolvedAt).toLocaleString('en-AU'):''}</summary><p style={{whiteSpace:'pre-wrap'}}><strong>Request:</strong> {row.message}</p><p style={{whiteSpace:'pre-wrap'}}><strong>Outcome:</strong> {row.resolution}</p><small>Resolved by {row.resolvedBy}</small></details>)}
  {error&&<p role="alert">{error}</p>}
  <dialog ref={dialog} className="masca-email-dialog" aria-label="Change resolution email preview" onCancel={event=>{event.preventDefault();close();}}>
   <header><strong>Resolve change request</strong><button type="button" disabled={busy} aria-label="Close resolution preview" onClick={close}>×</button></header>
   {preview&&<><p><strong>To:</strong> {preview.to}</p><p><strong>Subject:</strong> {preview.subject}</p><iframe sandbox="" title="Resolution email content" srcDoc={preview.html}/><footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="button" className="masca-action" disabled={busy||modified} onClick={()=>action('resolve')}>{busy?'Sending…':'Send confirmation & mark resolved'}</button></footer>{error&&<p role="alert">{error}</p>}</>}
  </dialog>
 </section>;
}
