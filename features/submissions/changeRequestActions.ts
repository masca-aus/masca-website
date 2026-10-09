import {previewEmailHTML} from './emailImages.ts';
import type {PayloadHandler} from 'payload';
import {mayManage,type ApprovedAccount,type OwnershipScope} from '../access/workspacePolicy.ts';
import {buildListingEmail,sendOnce,type ListingCollection,type EmailContent} from './listingEmail.ts';
import {changeLink} from './listingChanges.ts';
import {storeFor,deliver,fingerprint} from './listingEmailActions.ts';
export function changeRequestAction(collection:ListingCollection):PayloadHandler{return async req=>{
 if(!req.user)return Response.json({message:'Sign in first.'},{status:401});
 const id=req.routeParams?.id;if(typeof id!=='string'&&typeof id!=='number')return Response.json({message:'Invalid listing.'},{status:400});
 const doc=await req.payload.findByID({collection,id,draft:true,depth:0,req,overrideAccess:false});
 if(process.env.WORKSPACE_AUTH_ENABLED==='true'&&!mayManage(req.user as unknown as ApprovedAccount,collection,(doc as unknown as {owningScope:OwnershipScope}).owningScope))return Response.json({message:'You cannot manage requests for this listing.'},{status:403});
 const rows=(await req.payload.find({collection:'listing-change-requests',where:{and:[{listingCollection:{equals:collection}},{listingID:{equals:String(id)}}]},sort:'-createdAt',limit:100,overrideAccess:true,depth:0})).docs;
 const records=(await req.payload.find({collection:'listing-emails',where:{and:[{listingCollection:{equals:collection}},{listingID:{equals:String(id)}}]},sort:'-createdAt',limit:100,overrideAccess:true,depth:0})).docs;
 if(req.method==='GET')return Response.json({requests:rows.map(row=>({...row,pendingOutcome:records.find(record=>record.kind==='change-resolution' && record.key.startsWith(`change-resolution-${row.id}-`))?.email && (records.find(record=>record.kind==='change-resolution' && record.key.startsWith(`change-resolution-${row.id}-`))!.email as EmailContent).outcome}))},{headers:{'Cache-Control':'no-store'}});
 if(!req.url||req.headers.get('origin')!==new URL(req.url).origin)return Response.json({message:'Open this action in the CMS.'},{status:403});
 const body=await req.json?.().catch(()=>null);
 const request=rows.find(row=>row.id===body?.requestID);
 if(!request||request.status!=='open')return Response.json({message:'This request is already resolved or no longer available.'},{status:409});
 if(!doc.submissionReceivedAt || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(doc.contactEmail || '')))return Response.json({message:'A valid external submitter email is required.'},{status:409});
 const resolution=typeof body?.resolution==='string'?body.resolution.trim():'';
 if(resolution.length<10 || resolution.length>4000)return Response.json({message:'Describe the outcome in 10–4,000 characters.'},{status:422});
 const prefix=`change-resolution-${request.id}-`;
 const cancelled=records.find(record=>record.kind==='cancelled-change-resolution' && record.key.startsWith(prefix));
 const key=prefix+(cancelled?.id || 'initial');
 const store=storeFor(req.payload,collection,id,'change-resolution');
 const pending=await store.get(key);
 const email:EmailContent=pending?.sentAt?pending.email:{...buildListingEmail(collection,{...doc},'update',{resolution,changeURL:changeLink(collection,{...doc},req.payload.secret,pending?new Date(pending.createdAt).getTime():Date.now())}),outcome:resolution};
 // Includes the saved listing state, so staff must preview again after editing or publishing.
 const version=fingerprint({...email,text:email.text+JSON.stringify(doc)});
 if(body.action==='preview')return Response.json({...email,html:previewEmailHTML(email.html),version});
 if(body.action!=='resolve' || body.confirmedReviewed!==true)return Response.json({message:'Confirm you reviewed and saved the listing changes.'},{status:400});
 if(body.version!==version)return Response.json({message:'The listing changed. Preview the confirmation again.'},{status:409});
 if(pending && fingerprint(pending.email as EmailContent)!==fingerprint(email))return Response.json({message:'A previous email attempt has different content. Restore the original outcome or check delivery in Resend before continuing.'},{status:409});
 try{
  const sent=await sendOnce(store,deliver,key,email,String(req.user.email));
  if(fingerprint(sent.email)!==fingerprint(email))return Response.json({message:'Another editor sent a different outcome. Refresh the request before continuing.'},{status:409});
  await req.payload.update({collection:'listing-change-requests',id:request.id,overrideAccess:true,data:{openKey:`resolved:${request.id}`,status:'resolved',resolution:email.outcome || resolution,resolvedAt:sent.sentAt,resolvedBy:sent.sentBy}});
  return Response.json({ok:true});
 }catch(error){return Response.json({message:(error as Error).message},{status:503});}
};}
