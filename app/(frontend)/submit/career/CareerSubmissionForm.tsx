"use client";
import { useRef, useState, type FormEvent } from 'react';
import { SubmissionSuccess } from '@/components/forms/SubmissionSuccess';
import { reconcileSubmissionErrors } from '@/components/forms/submissionErrors';
import { parseCareerSubmission } from '@/features/careers/careerSubmission';
import Button from '@/components/Button';
import { PublicFormWizard } from '@/components/forms/PublicFormWizard';
import { FieldShell, TextField, TextAreaField, fieldClass } from '@/components/forms/PublicFields';
import { JOB_TYPES, WORK_MODES, INTERNATIONAL_OPTIONS, STUDY_LEVELS, JOB_TYPE_LABEL, WORK_MODE_LABEL, INTERNATIONAL_LABEL, STUDY_LEVEL_LABEL } from '@/utils/careers';
type Result={ok:boolean;message:string;fieldErrors?:Record<string,string[]>};
export function CareerSubmissionForm() {
 const formRef=useRef<HTMLFormElement>(null);
 const [pending,setPending]=useState(false);
 const [response,setResponse]=useState<Result|null>(null);
 const error=(name:string)=>response?.fieldErrors?.[name]?.[0];
 const text=(name:string,label:string,required=false,type='text',maxLength=100)=> <TextField key={name} id={`career-${name}`} name={name} label={label} required={required} type={type} maxLength={maxLength} error={error(name)}/>;
 const labels:Record<string,string>={...JOB_TYPE_LABEL,...WORK_MODE_LABEL,...INTERNATIONAL_LABEL,...STUDY_LEVEL_LABEL};
 const select=(name:string,label:string,options:readonly string[],multiple=false)=><FieldShell id={`career-${name}`} label={`${label} *`} error={error(name)}><select id={`career-${name}`} name={name} required multiple={multiple} defaultValue={multiple?[]:''} className={fieldClass} aria-invalid={Boolean(error(name))} aria-describedby={error(name)?`career-${name}-error`:undefined}>{!multiple&&<option value="">Choose an option</option>}{options.map(value=><option key={value} value={value}>{labels[value]||value}</option>)}</select></FieldShell>;
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();const form=event.currentTarget;setPending(true);setResponse(null);
  try { const res=await fetch('/api/submit-career',{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});const result:Result=await res.json();if(typeof result.ok!=='boolean'||typeof result.message!=='string')throw new Error('Invalid response');setResponse(result);if(result.ok)form.reset(); }
  catch {setResponse({ok:false,message:'We could not send your submission. Your details are still here. Please try again.'});}
  finally {setPending(false);}
 }
 return <div className="mx-auto max-w-4xl"><p className="mb-8 text-gray-700">Fields marked * are required. You can check everything before submitting.</p>
 {response&&!response.ok&&<div role={response.ok?'status':'alert'} className={`mb-8 rounded-lg p-5 ${response.ok?'bg-blue-50 text-blue-600':'bg-red-50 text-red-600'}`}><p>{response.message}</p>{!response.ok&&response.fieldErrors&&<ul className="mt-3 list-disc pl-5">{Object.entries(response.fieldErrors).map(([key,errors])=><li key={key}>{errors.join(' ')}</li>)}</ul>}</div>}
 <SubmissionSuccess open={response?.ok===true} message={response?.message||''} href="/careers" label="Back to Careers" onClose={()=>setResponse(null)}/>
 <PublicFormWizard innerRef={formRef} action="/api/submit-career" onSubmit={submit} steps={['Role & company','Location & eligibility','Application & contact']} pending={pending} response={response} onChange={()=>{
          if(!formRef.current || !response || response.ok)return;
          const result=parseCareerSubmission(new FormData(formRef.current));
          setResponse(current=>reconcileSubmissionErrors(current,result.ok?{}:result.fieldErrors));
        }}>
 <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-blue-100 p-6 md:p-8"><legend className="px-2 text-lg font-bold text-blue-600">Role & company</legend><div className="grid gap-6 md:grid-cols-2">{text('title','Role title',true,'text',120)}{text('company','Company',true,'text',80)}{select('type','Opportunity type',JOB_TYPES)}{text('industry','Industry')}{text('companyWebsite','Company website',false,'url',2000)}{text('pay','Pay or salary',false,'text',80)}</div><TextAreaField id="career-description" name="description" label="Role description" required minLength={20} maxLength={4000} rows={6} error={error('description')}/></fieldset>
 <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-blue-100 p-6 md:p-8"><legend className="px-2 text-lg font-bold text-blue-600">Location & eligibility</legend><div className="grid gap-6 md:grid-cols-2">{text('country','Country',true,'text',80)}{text('state','State or region')}{text('city','City')}{select('workMode','Work mode',WORK_MODES)}{select('international','Open to international students?',INTERNATIONAL_OPTIONS)}{select('studyLevels','Study levels',STUDY_LEVELS,true)}</div><p className="text-body-sm text-gray-700">Select all relevant study levels (hold Command or Ctrl on desktop), or choose Any.</p>{text('eligibility','Additional eligibility requirements',false,'text',200)}</fieldset>
 <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-blue-100 p-6 md:p-8"><legend className="px-2 text-lg font-bold text-blue-600">Application & contact</legend>{text('applyUrl','Application link or email address',true,'text',2000)}<TextField id="career-closes" name="closes" label="Closing date" type="date" hint="Leave blank for ongoing applications." error={error('closes')}/><p className="text-gray-700">Contact details are only used by the MASCA team to review your submission. They are not shown in the public listing. Read our <a className="font-bold text-blue-600 underline" href="/privacy">privacy notice</a>.</p><div className="grid gap-6 md:grid-cols-2">{text('contactName','Your name',true,'text',120)}{text('contactEmail','Your email',true,'email',254)}</div><label className="flex items-start gap-3 text-gray-700"><input name="accuracyConfirmed" type="checkbox" required className="mt-1 size-5 accent-blue-600"/>I confirm these details are accurate and I am authorised to share this opportunity. *</label></fieldset>
 <div className="flex flex-wrap items-center gap-5"><Button type="submit" variant="accent" disabled={pending}>{pending?'Submitting…':'Submit opportunity →'}</Button><p className="text-body-sm text-gray-700">MASCA will review your submission before it appears online.</p></div>
 </PublicFormWizard></div>;
}
