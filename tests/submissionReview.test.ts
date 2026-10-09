import { publicEventSubmission } from '../features/access/publicSubmissionContext';
import { expect, it } from 'vitest';
import { deriveCMSStatus, statusActions } from '../features/admin/cmsStatus';
it('distinguishes public submissions from internal drafts in both collections', () => {
 for(const collection of ['events','careers'] as const) {
  const submitted = {_status:'draft',submittedForReview:true};
  const state=deriveCMSStatus(collection,submitted,submitted,'active');
  expect(state.status).toBe('review');
  expect(statusActions(collection,state)).toContainEqual({value:'publish',label:'Approve & publish'});
  expect(deriveCMSStatus(collection,{_status:'draft'},{_status:'draft'},'active').status).toBe('draft');
  expect(deriveCMSStatus(collection,submitted,submitted,'archived').status).toBe('archived');
 }
});

import { completeSubmissionReview } from '../features/submissions/review';
it('clears review only on publication, not when saving or autosaving a draft', () => {
 const run=(data:Record<string,unknown>,draft:boolean)=>completeSubmissionReview({data,req:{query:{draft}}} as never);
 expect(run({_status:'published',submittedForReview:true},false)).toMatchObject({submittedForReview:false});
 expect(run({_status:'draft',submittedForReview:true},true)).toMatchObject({submittedForReview:true});
 expect(run({_status:'published',submittedForReview:true},true)).toMatchObject({submittedForReview:true});
});
it('retains public submission provenance after publication for receipt recovery',()=>{
 const created=completeSubmissionReview({operation:'create',context:{publicEventSubmission},data:{submittedForReview:true,_status:'draft'},req:{query:{draft:true}}} as never) as Record<string,unknown>;
 expect(created.submissionReceivedAt).toBeTruthy();
 const published=completeSubmissionReview({operation:'update',data:{...created,_status:'published'},req:{query:{draft:false}}} as never) as Record<string,unknown>;
 expect(published.submittedForReview).toBe(false);
 expect(published.submissionReceivedAt).toBe(created.submissionReceivedAt);
});

it('does not classify an internal review request as an external submission',()=>{
 const data=completeSubmissionReview({operation:'create',context:{},data:{submittedForReview:true,_status:'draft'},req:{query:{draft:true}}} as never) as Record<string,unknown>;
 expect(data.submissionReceivedAt).toBeUndefined();
});
