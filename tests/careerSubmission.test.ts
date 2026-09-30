import { expect, it } from 'vitest';
import { parseCareerSubmission } from '../features/careers/careerSubmission';
function form(overrides: Record<string,string>={}) { const f=new FormData(); for(const [k,v] of Object.entries({title:'Graduate Engineer',company:'Example employer',type:'graduate',country:'Australia',state:'QLD',city:'Brisbane',workMode:'hybrid',international:'yes',studyLevels:'graduate',description:'An opportunity to work with our engineering team.',applyUrl:'https://example.org/apply',contactName:'Test contact',contactEmail:'test@example.org',accuracyConfirmed:'on',...overrides})) f.set(k,v); return f; }
it('validates a public career and strips forged access fields',()=>{
 const result=parseCareerSubmission(form({_status:'published',featured:'true',owningScope:'QLD',submittedForReview:'false'}));
 expect(result.ok).toBe(true);
 if(result.ok) { expect(result.data.title).toBe('Graduate Engineer'); expect(result.data).not.toHaveProperty('_status'); expect(result.data).not.toHaveProperty('owningScope'); }
});
it('rejects missing required fields, invalid links, impossible dates and missing consent',()=>{
 const result=parseCareerSubmission(form({title:'',company:'',applyUrl:'javascript:alert(1)',closes:'2026-02-30',accuracyConfirmed:''}));
 expect(result.ok).toBe(false);
 if(!result.ok) for(const field of ['title','company','applyUrl','closes','accuracyConfirmed']) expect(result.fieldErrors[field]).toBeDefined();
});
