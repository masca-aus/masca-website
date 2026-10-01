import type { PayloadHandler } from 'payload';
import { mayManage, type ApprovedAccount, type OwnershipScope } from '../access/workspacePolicy.ts';
const fields = {
 events: ['title','organisation','description','venue','state','streetAddress','venueDetails','poster','ticketURL','owningScope'],
 careers: ['title','company','type','industry','companyWebsite','logoUrl','country','state','city','workMode','international','studyLevels','eligibility','applyUrl','pay','description','tags','owningScope'],
};
export function duplicateData(collection: 'events'|'careers', source: Record<string, unknown>) {
 const data: Record<string, unknown> = Object.fromEntries(fields[collection].filter(key => source[key] !== undefined).map(key => [key,source[key]]));
 data.title = `${String(source.title || 'Untitled').slice(0,105)} (copy)`;
 Object.assign(data,{_status:'draft',submittedForReview:false,needsChanges:false,reviewNotes:null});
 if(collection==='events') Object.assign(data,{reviewStatus:'pending',startDate:null,endDate:null,contactName:null,contactEmail:null});
 else Object.assign(data,{added:null,closes:null,featured:false,contactName:null,contactEmail:null});
 return data;
}
export function listingAction(collection:'events'|'careers'):PayloadHandler { return async req => {
 if(!req.user) return Response.json({message:'Sign in first.'},{status:401});
 const id = req.routeParams?.id;
 if(typeof id!=='string' && typeof id!=='number') return Response.json({message:'Invalid listing.'},{status:400});
 const source = await req.payload.findByID({collection,id,req,overrideAccess:false,draft:true,depth:0});
 if(process.env.WORKSPACE_AUTH_ENABLED==='true' && !mayManage(req.user as unknown as ApprovedAccount,collection,(source as unknown as {owningScope:OwnershipScope}).owningScope)) return Response.json({message:'You cannot edit this listing.'},{status:403});
 const body = await req.json?.().catch(()=>null);
 req.query = {...req.query,draft:'true'};
 if(body?.action==='duplicate') {
  const doc=await req.payload.create({collection,req,overrideAccess:false,draft:true,depth:0,data:duplicateData(collection,source as unknown as Record<string,unknown>) as never});
  return Response.json({id:doc.id});
 }
 if(body?.action==='needs-changes') {
  const note=typeof body.note==='string'?body.note.trim():'';
  if(!note || note.length>2000) return Response.json({message:'Add a review note (up to 2,000 characters).'},{status:400});
  const live=await req.payload.findByID({collection,id,req,overrideAccess:false,draft:false,depth:0});
  if(!source.submittedForReview || live._status==='published') return Response.json({message:'Only unpublished submissions can be marked as needing changes.'},{status:409});
  await req.payload.update({collection,id,req,overrideAccess:false,overrideLock:false,draft:true,data:{needsChanges:true,reviewNotes:note} as never});
  return Response.json({id});
 }
 return Response.json({message:'Unknown action.'},{status:400});
}; }
