import { z } from 'zod';
import { JOB_TYPES, WORK_MODES, INTERNATIONAL_OPTIONS, STUDY_LEVELS } from '../../utils/careers.ts';
import { validCareerDate, validCareerURL } from './careerModel.ts';
const schema=z.object({
 title:z.string().trim().min(3,'Enter the role title.').max(120), company:z.string().trim().min(2,'Enter the company name.').max(80),
 type:z.enum(JOB_TYPES), country:z.string().trim().min(2,'Enter a country.').max(80), state:z.string().trim().max(100),city:z.string().trim().max(100),
 workMode:z.enum(WORK_MODES), international:z.enum(INTERNATIONAL_OPTIONS), studyLevels:z.array(z.enum(STUDY_LEVELS)).min(1,'Choose at least one study level.'),
 industry:z.string().trim().max(100), eligibility:z.string().trim().max(200), pay:z.string().trim().max(80),
 description:z.string().trim().min(20,'Describe the role in at least 20 characters.').max(4000),
 applyUrl:z.string().trim().max(2000).refine(v=>validCareerURL(v,true),'Enter an application link or email address.'),
 companyWebsite:z.string().trim().max(2000).refine(v=>!v||validCareerURL(v),'Enter a full company website URL.'),
 closes:z.string().refine(validCareerDate,'Choose a valid closing date.'),
 contactName:z.string().trim().min(2,'Enter your name.').max(120),contactEmail:z.string().trim().email('Enter a valid contact email.').max(254),
 accuracyConfirmed:z.enum(['on','true'],{message:'Confirm the details are accurate.'}),
});
export type CareerSubmissionInput=Omit<z.infer<typeof schema>,'accuracyConfirmed'>;
export function parseCareerSubmission(form:FormData): {ok:true;data:CareerSubmissionInput}|{ok:false;fieldErrors:Record<string,string[]>} {
 const values=Object.fromEntries(Object.keys(schema.shape).map(key=>[key,typeof form.get(key)==='string'?form.get(key):'']));
 const result=schema.safeParse({...values,studyLevels:form.getAll('studyLevels')});
 if(!result.success) return {ok:false,fieldErrors:result.error.flatten().fieldErrors as Record<string,string[]>};
 const {accuracyConfirmed,...data}=result.data;
 void accuracyConfirmed;
 return {ok:true,data};
}
