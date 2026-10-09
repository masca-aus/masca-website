import {inlineEmailImages,previewEmailHTML} from './emailImages.ts';
import {changeLink} from './listingChanges.ts';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import type { Payload, PayloadHandler } from 'payload';
import { mayManage, type ApprovedAccount, type OwnershipScope } from '../access/workspacePolicy.ts';
import { buildListingEmail, approvalProblem, sendOnce, type ListingCollection, type EmailContent, type SendRecord, type SendStore } from './listingEmail.ts';
export const fingerprint=(email:EmailContent)=>createHash('sha256').update(JSON.stringify({to:email.to,subject:email.subject,html:email.html,text:email.text,...(email.outcome?{outcome:email.outcome}:{})})).digest('hex');
export function storeFor(payload:Payload,collection:ListingCollection,id:string|number,kind:string):SendStore {
 return {
  get:async key=>(await payload.find({collection:'listing-emails',where:{key:{equals:key}},limit:1,depth:0,overrideAccess:true})).docs[0] as unknown as SendRecord|undefined,
  create:async data=>await payload.create({collection:'listing-emails',overrideAccess:true,data:{...data,listingCollection:collection,listingID:String(id),kind}}) as unknown as SendRecord,
  markSent:async(id,data)=>payload.update({collection:'listing-emails',id,overrideAccess:true,data}),
 };
}
async function emailRecords(payload:Payload,collection:ListingCollection,id:string|number) {
 return (await payload.find({collection:'listing-emails',where:{and:[{listingCollection:{equals:collection}},{listingID:{equals:String(id)}}]},sort:'-createdAt',limit:100,overrideAccess:true,depth:0})).docs;
}
export async function deliver(email:EmailContent,key:string) {
 if(!process.env.RESEND_KEY)throw Error('Email sending is not configured.');
 const images=inlineEmailImages(email.html);
 const {data,error}=await new Resend(process.env.RESEND_KEY).emails.send({from:'MASCA National <hello@masca.org.au>',replyTo:process.env.LISTING_EMAIL_REPLY_TO || 'hello@masca.org.au',to:email.to,subject:email.subject,html:images.html,text:email.text,attachments:images.attachments},{idempotencyKey:key});
 if(error || !data?.id)throw Error('Email was not confirmed. Please retry; the same request will not send twice.');
 return data.id;
}
export async function sendSubmissionReceipt(payload:Payload,collection:ListingCollection,id:string|number) {
 try {
  const doc=await payload.findByID({collection,id,draft:true,depth:0,overrideAccess:true});
  const records=await emailRecords(payload,collection,id);
  const cancelled=records.find(record=>record.kind==='cancelled-receipt');
  await sendOnce(storeFor(payload,collection,id,'receipt'),deliver,`receipt-${collection}-${id}-${cancelled?.id || 'initial'}`,buildListingEmail(collection,{...doc,id} as unknown as Record<string,unknown>,'receipt',{changeURL:changeLink(collection,{...doc,id},payload.secret)}),'Website submission');
 }catch{payload.logger?.error(`Receipt email pending for ${collection} ${id}. Retry from the CMS.`);}
}
export function listingEmailAction(collection:ListingCollection):PayloadHandler {return async req=>{
 if(!req.user)return Response.json({message:'Sign in first.'},{status:401});
 const id=req.routeParams?.id;
 if(typeof id!=='string' && typeof id!=='number')return Response.json({message:'Invalid listing.'},{status:400});
 const doc=await req.payload.findByID({collection,id,req,overrideAccess:false,draft:false,depth:0});
 if(process.env.WORKSPACE_AUTH_ENABLED==='true' && !mayManage(req.user as unknown as ApprovedAccount,collection,(doc as unknown as {owningScope:OwnershipScope}).owningScope))return Response.json({message:'You cannot send emails for this listing.'},{status:403});
 const origin=doc.submissionReceivedAt?'external':'internal';
 if(origin==='internal'){
  if(req.method==='GET')return Response.json({origin,problem:null,lastSent:null,receipt:null,expired:[]});
  return Response.json({message:'Approval emails are only available for external submissions.'},{status:409});
 }
 const records=await emailRecords(req.payload,collection,id);
 const latest=records.find(row=>row.kind==='approval' && row.sentAt);
 const receipt=records.find(row=>row.kind==='receipt');
 const expired=records.filter(row=>['receipt','approval','change-resolution'].includes(row.kind) && !row.sentAt && Date.now()-new Date(row.createdAt).getTime()>23*60*60*1000).map(row=>({id:row.id,kind:row.kind}));
 const visible=await req.payload.find({collection,where:{id:{equals:id}},limit:1,depth:0,overrideAccess:false,req:{...req,user:null} as never});
 const problem=approvalProblem(collection,doc as unknown as Record<string,unknown>,visible.docs.length>0);
 if(req.method==='GET')return Response.json({origin,problem,lastSent:latest?{id:latest.id,sentAt:latest.sentAt,sentBy:latest.sentBy}:null,expired,receipt:receipt?{sentAt:receipt.sentAt}:(doc.submissionReceivedAt || doc.submittedForReview) && doc.contactEmail?{sentAt:null}:null});
 if(!req.url || req.headers.get('origin')!==new URL(req.url).origin)return Response.json({message:'Open this action in the CMS.'},{status:403});
 const body=await req.json?.().catch(()=>null);
 if(body?.action==='confirm-sent'){
  const pending=records.find(row=>row.id===body.pendingID && expired.some(item=>item.id===row.id));
  if(!pending || typeof body.providerID!=='string' || !/^[a-f0-9-]{36}$/i.test(body.providerID))return Response.json({message:'Enter the email ID from Resend.'},{status:400});
  if(!process.env.RESEND_KEY)return Response.json({message:'Email sending is not configured.'},{status:503});
  const result=await new Resend(process.env.RESEND_KEY).emails.get(body.providerID);
  const original=pending.email as EmailContent;
  if(result.error || !result.data || !result.data.to.includes(original.to) || result.data.subject!==original.subject || new Date(result.data.created_at).getTime()<new Date(pending.createdAt).getTime()-300000)return Response.json({message:'That Resend email does not match this attempt.'},{status:409});
  await req.payload.update({collection:'listing-emails',id:pending.id,overrideAccess:true,data:{sentAt:result.data.created_at,providerID:body.providerID,email:{...(pending.email as Record<string,unknown>),resolution:{by:req.user.email,at:new Date().toISOString(),reason:'Resend acceptance verified'}}}});
  return Response.json({ok:true});
 }
 if(body?.action==='reset-pending'){
  const pending=records.find(row=>row.id===body.pendingID && expired.some(item=>item.id===row.id));
  if(!pending || body.confirmedNotSent!==true)return Response.json({message:'Confirm non-delivery in Resend before restarting an expired attempt.'},{status:409});
  await req.payload.update({collection:'listing-emails',id:pending.id,overrideAccess:true,data:{kind:`cancelled-${pending.kind}`,email:{...(pending.email as Record<string,unknown>),resolution:{by:req.user.email,at:new Date().toISOString(),reason:'Editor confirmed non-delivery in Resend'}}}});
  return Response.json({ok:true});
 }
 if(body?.action==='retry-receipt'){
  if(receipt?.sentAt || (!receipt && (!(doc.submissionReceivedAt || doc.submittedForReview) || !doc.contactEmail)))return Response.json({message:'No pending receipt.'},{status:409});
  try{const cancelled=records.find(row=>row.kind==='cancelled-receipt');await sendOnce(storeFor(req.payload,collection,id,'receipt'),deliver,receipt?.key || `receipt-${collection}-${id}-${cancelled?.id || 'initial'}`,receipt?.email as EmailContent || buildListingEmail(collection,{...doc,id} as unknown as Record<string,unknown>,'receipt',{changeURL:changeLink(collection,{...doc,id},req.payload.secret)}),String(req.user.email));return Response.json({ok:true});}catch(error){return Response.json({message:(error as Error).message},{status:503});}
 }
 if(problem)return Response.json({message:problem},{status:409});
 const cancelled=records.find(record=>record.kind==='cancelled-approval');
 const key=`approval-${collection}-${id}-${latest?latest.id:'initial'}-${cancelled?.id || 'initial'}`;
 const pending=records.find(record=>record.key===key && !record.sentAt);
 const email=buildListingEmail(collection,{...doc,id} as unknown as Record<string,unknown>,'approval',{changeURL:changeLink(collection,{...doc,id},req.payload.secret,pending?new Date(pending.createdAt).getTime():Date.now())});
 const version=fingerprint(email);
 if(pending && fingerprint(pending.email as EmailContent)!==version)return Response.json({message:'A previous attempt has different content. Check its status in Resend before sending an updated email.'},{status:409});
 if(body?.action==='preview')return Response.json({...email,html:previewEmailHTML(email.html),version,lastSent:latest?{id:latest.id,sentAt:latest.sentAt,sentBy:latest.sentBy}:null});
 if(body?.action!=='send')return Response.json({message:'Unknown action.'},{status:400});
 if(body.version!==version)return Response.json({message:'The listing changed. Close and preview the email again.'},{status:409});
 // Repeated initial requests use one key. Resends explicitly reference the last accepted email.
 if(latest && (!body.resend || body.previousID!==latest.id))return Response.json({message:'Already sent. Preview again to deliberately resend.'},{status:409});
 if(!latest && body.resend)return Response.json({message:'Refresh the preview first.'},{status:409});
 try{const result=await sendOnce(storeFor(req.payload,collection,id,'approval'),deliver,key,email,String(req.user.email));return Response.json({ok:true,sentAt:result.sentAt,sentBy:result.sentBy});}
 catch(error){return Response.json({message:(error as Error).message},{status:503});}
};}
