import { publicEventSubmission, publicCareerSubmission } from '../access/publicSubmissionContext.ts';
import type { CollectionBeforeChangeHook, Field } from 'payload';
export const submittedForReviewField: Field = {
 name:'submittedForReview', type:'checkbox', defaultValue:false,
 access:{read:({req})=>Boolean(req.user),create:()=>false,update:()=>false},
 admin:{hidden:true},
};
/** Publishing is the deliberate approval action. Saving a draft preserves the queue. */
export const completeSubmissionReview: CollectionBeforeChangeHook = ({data,req,operation,context}) => {
 if(operation==='create' && data.submittedForReview && (context?.publicEventSubmission===publicEventSubmission || context?.publicCareerSubmission===publicCareerSubmission)) data.submissionReceivedAt=new Date().toISOString();
 const draft=req.query?.draft===true || req.query?.draft==='true';
 if(!draft && data._status==='published') { data.submittedForReview=false; data.needsChanges=false; }
 return data;
};

export const reviewFields: Field[] = [
 {name:'submissionReceivedAt',type:'date',access:{read:({req})=>Boolean(req.user),create:()=>false,update:()=>false},admin:{hidden:true}},
 {name:'needsChanges',type:'checkbox',defaultValue:false,access:{read:({req})=>Boolean(req.user)},admin:{hidden:true}},
 {name:'reviewNotes',type:'textarea',access:{read:({req})=>Boolean(req.user)},admin:{hidden:true}},
];
