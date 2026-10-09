'use client';
import { useEffect, useRef, useState } from 'react';
import { useDocumentInfo, useFormModified } from '@payloadcms/ui';
import './listingEmail.css';
import {ListingChangeControl} from './ListingChangeControl';
type Sent={id:number;sentAt:string;sentBy:string};
type Status={origin:'internal'|'external';expired?:{id:number;kind:string}[];problem:string|null;lastSent:Sent|null;receipt:{sentAt?:string|null}|null};
type Preview={to:string;subject:string;html:string;version:string;lastSent:Sent|null};
export function ListingEmailControl({collection}:{collection:'events'|'careers'}) {
 const {id,hasSavePermission,data,hasPublishedDoc}=useDocumentInfo();const modified=useFormModified();
 const [status,setStatus]=useState<Status|null>(null);const [preview,setPreview]=useState<Preview|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const endpoint=`/api/${collection}/${id}/approval-email`;
 useEffect(()=>{if(!id || hasSavePermission===false)return;let alive=true;fetch(endpoint).then(async response=>{if(!response.ok)throw Error('Unable to load email status.');return response.json();}).then(result=>{if(alive)setStatus(result);}).catch(()=>{if(alive)setError('Unable to load email status. Refresh to try again.');});return()=>{alive=false;};},[endpoint,id,hasSavePermission,data?.updatedAt,hasPublishedDoc]);
 if(!id || hasSavePermission===false)return null;
 async function request(body:Record<string,unknown>){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.message||'Unable to send email.');return result;}
 async function open(){setBusy(true);setError('');try{setPreview(await request({action:'preview'}));dialog.current?.showModal();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 function close(){if(busy)return;dialog.current?.close();setPreview(null);trigger.current?.focus();}
 async function send(){if(!preview)return;setBusy(true);setError('');try{await request({action:'send',version:preview.version,resend:Boolean(preview.lastSent),previousID:preview.lastSent?.id});window.location.reload();}catch(error){setError((error as Error).message);setBusy(false);}}
 async function retryReceipt(){setBusy(true);setError('');try{await request({action:'retry-receipt'});window.location.reload();}catch(error){setError((error as Error).message);setBusy(false);}}
 async function confirmSent(pendingID:number){const providerID=window.prompt('Paste the email ID from Resend. The CMS will verify the recipient and subject before recording it as sent.');if(!providerID)return;setBusy(true);setError('');try{await request({action:'confirm-sent',pendingID,providerID:providerID.trim()});window.location.reload();}catch(error){setError((error as Error).message);setBusy(false);}}
 async function resetPending(pendingID:number){if(!window.confirm('First check Resend for this recipient and subject. Continue only if you confirmed this email was NOT sent. This allows a new attempt which may send another email.'))return;setBusy(true);setError('');try{await request({action:'reset-pending',pendingID,confirmedNotSent:true});window.location.reload();}catch(error){setError((error as Error).message);setBusy(false);}}
 if(!status)return <section className="masca-listing-email" aria-label="Listing origin"><p>{error || 'Loading submission details…'}</p></section>;
 if(status.origin==='internal')return <section className="masca-listing-email" aria-label="Listing origin"><div><strong>Internal listing</strong><p>Created by the MASCA team. No external submitter to notify.</p></div></section>;
 return <><ListingChangeControl collection={collection}/><section className="masca-listing-email" aria-label="Organiser email">
  <div><strong>{status?.origin==='external'?'External submission':'Listing origin'}</strong>{status?.origin==='external' && <small>Approval email goes to the external submitter.</small>}<p>{status?.lastSent?`Sent ${new Date(status.lastSent.sentAt).toLocaleString('en-AU')} by ${status.lastSent.sentBy}`:status?.problem || 'Organiser hasn’t been notified.'}</p><small>Publishing or editing this listing does not send an approval email.</small></div>
  {status?.origin==='external' && <button ref={trigger} type="button" className="masca-action masca-action--secondary" disabled={busy||modified||!status||Boolean(status.problem)} onClick={open}>{status?.lastSent?'Preview and resend approval email':'Send approval email'}</button>}
  {modified && <small>Save your changes before previewing an email.</small>}
  {status?.receipt && !status.receipt.sentAt && <div><p>Submission receipt is pending.</p><button type="button" disabled={busy} onClick={retryReceipt}>Retry receipt email</button></div>}
  {status?.expired?.map(item=><div key={item.id}><p>This {item.kind} attempt needs a delivery check in Resend.</p><button type="button" disabled={busy} onClick={()=>confirmSent(item.id)}>Record confirmed send</button> <button type="button" disabled={busy} onClick={()=>resetPending(item.id)}>Confirm not sent and restart attempt</button></div>)}
  {error && !preview && <p role="alert">{error}</p>}
  <dialog ref={dialog} className="masca-email-dialog" aria-label="Approval email preview" onCancel={event=>{event.preventDefault();close();}}>
   <header><strong>{preview?.lastSent?'Resend approval email':'Approval email preview'}</strong><button type="button" disabled={busy} aria-label="Close email preview" onClick={close}>×</button></header>
   {preview && <><p><strong>To:</strong> {preview.to}</p><p><strong>Subject:</strong> {preview.subject}</p>{preview.lastSent && <p>This organiser has already been notified. Sending again will create another email.</p>}<iframe sandbox="" title="Email content" srcDoc={preview.html}/><footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="button" disabled={busy||modified} className="masca-action" onClick={send}>{busy?'Sending…':preview.lastSent?'Resend email':'Send email'}</button></footer>{error&&<p role="alert">{error}</p>}</>}
  </dialog>
 </section></>;
}
