'use client';
import {useEffect,useState} from 'react';
import styles from './SubmissionChangeForm.module.css';
type Details={title:string;open:{message:string;createdAt:string}|null};
export function SubmissionChangeForm(){
 const [token,setToken]=useState('');const [details,setDetails]=useState<Details|null>(null);const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [expired,setExpired]=useState(false);const [success,setSuccess]=useState('');
 async function request(token:string,action:string,message?:string){const response=await fetch('/api/submission-change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action,message})});const result=await response.json();return {response,result};}
 useEffect(()=>{
  const value=new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
  let alive=true;
  Promise.resolve().then(()=>{if(!alive)return;if(!value){setError('Open the private link in your confirmation email to update your submission.');return;}setToken(value);return request(value,'inspect');}).then(outcome=>{if(!alive||!outcome)return;const {response,result}=outcome;if(response.ok)setDetails(result);else{setError(result.message);setExpired(Boolean(result.expired));}}).catch(()=>{if(alive)setError('Unable to load your submission. Please refresh to try again.');});
  return()=>{alive=false;};
 },[]);
 async function submit(action:'submit'|'renew'){
  setBusy(true);setError('');try{const {response,result}=await request(token,action,message);if(!response.ok)throw Error(result.message);setSuccess(result.message);}catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 return <section className={styles.panel}><p className={styles.eyebrow}>MASCA NATIONAL</p><h1 className={styles.heading}>Need to update your submission?</h1>
  {success?<p role="status">{success}</p>:<>
   {error&&<p role="alert">{error}</p>}
   {expired&&<button className={styles.button} disabled={busy} onClick={()=>submit('renew')}>{busy?'Sending…':'Email me a fresh link'}</button>}
   {!details&&!error&&<p>Loading your submission…</p>}
   {details&&<><div className={styles.submission}><span className={styles.caption}>YOUR SUBMISSION</span><h2 className={styles.title}>{details.title}</h2></div>{details.open?<><h3>Your request is awaiting review</h3><p style={{whiteSpace:'pre-wrap'}}>{details.open.message}</p><p>Submitted {new Date(details.open.createdAt).toLocaleDateString('en-AU')}. No need to send it again. Reply to your confirmation email if you need to add anything.</p></>:<form className={styles.form} onSubmit={event=>{event.preventDefault();void submit('submit');}}>
    <p className={styles.intro}>Tell us what needs changing. MASCA will review your request before updating the listing.</p>
    <label className={styles.label} htmlFor="change-message">What would you like us to update?</label>
    <textarea id="change-message" required minLength={10} maxLength={4000} rows={5} aria-describedby="change-help" className={styles.textarea} value={message} onChange={event=>setMessage(event.target.value)}/>
    <p id="change-help" className={styles.help}>Include the new details, such as a corrected date, venue or application link. Don’t include passwords or payment details.</p>
    <button className={styles.button} type="submit" disabled={busy}>{busy?'Submitting…':'Send change request'}</button>
   </form>}</>}
  </>}
 </section>;
}
