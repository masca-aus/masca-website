import assert from 'node:assert/strict';
import type { Payload } from 'payload';
import { publicCareerSubmission, publicEventSubmission } from '../features/access/publicSubmissionContext.ts';
export async function verifyPublicSubmissions(payload:Payload) {
 assert.equal(payload.db.schemaName,'cms_auth_preview');
 const admin=(await payload.find({collection:'users',where:{email:{equals:'admin@masca.org.au'}},limit:1})).docs[0];
 const req={user:{...admin,collection:'users' as const}};
 for(const collection of ['careers','events'] as const) {
  let id:number|undefined;
  try {
   const data=collection==='careers'?{title:'Submission verification',company:'Test only',type:'internship',country:'Australia',state:'QLD',city:'Brisbane',workMode:'onsite',international:'yes',studyLevels:['any'],description:'Temporary submission to verify moderation.',applyUrl:'https://example.org/apply',added:'2026-10-01'}:{title:'Submission verification',organisation:'MASCA',description:'Temporary submission to verify moderation.',venue:'Brisbane',state:'QLD',startDate:'2027-10-01T08:00:00.000Z',reviewStatus:'pending'};
   const doc=await payload.create({collection,draft:true,overrideAccess:true,context:collection==='careers'?{publicCareerSubmission}:{publicEventSubmission},data:{...data,owningScope:'National',_status:'draft',submittedForReview:true,contactName:'Test',contactEmail:'test@example.org'} as never});id=doc.id;
   const saved=await payload.findByID({collection,id,draft:true,overrideAccess:false,req});
   assert.equal(saved.submittedForReview,true);
   assert.equal((saved.cmsStatus as {status:string}).status,'review');
   const publicList=await payload.find({collection,overrideAccess:false,where:{id:{equals:id}}});assert.equal(publicList.totalDocs,0);
   await payload.update({collection,id,draft:false,overrideAccess:false,req,data:{_status:'published',...(collection==='events'?{reviewStatus:'approved'}:{})} as never});
   const live=await payload.find({collection,overrideAccess:false,where:{id:{equals:id}}});assert.equal(live.totalDocs,1);
   assert.equal(live.docs[0].contactEmail,undefined);assert.equal(live.docs[0].contactName,undefined);
   const approved=await payload.findByID({collection,id,req,overrideAccess:false});assert.equal(approved.submittedForReview,false);
  } finally {if(id)await payload.delete({collection,id,overrideAccess:true});}
 }
 console.log('Public submission moderation and contact privacy verified for both collections.');
}
