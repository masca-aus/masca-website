import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {Payload} from 'payload';
import type {Listing,ListingCollection} from './listingEmail.ts';
const DAY=86400000;
export class ChangeLinkError extends Error {}
export const contactHash=(doc:Listing)=>createHash('sha256').update(String(doc.contactEmail || '').trim().toLowerCase()).digest('hex');
type Claims={collection:ListingCollection;id:string;emailHash:string;expires:number};
export function createChangeToken(collection:ListingCollection,doc:Listing,secret:string,now=Date.now()){
 if(!secret)throw Error('Private links are not configured.');
 // Stable within a day so preview/send fingerprints agree; the outbox retains the exact link sent.
 const claims:Claims={collection,id:String(doc.id),emailHash:contactHash(doc),expires:Math.floor(now/DAY)*DAY+90*DAY};
 const data=Buffer.from(JSON.stringify(claims)).toString('base64url');
 return `${data}.${createHmac('sha256',secret).update('listing-change:'+data).digest('base64url')}`;
}
export function verifyChangeToken(token:string,secret:string,now=Date.now(),allowExpired=false):Claims|null {
 if(!secret || token.length>1024)return null;
 try{
  const [data,signature,...extra]=token.split('.');if(extra.length || !data || !signature)return null;
  const expected=createHmac('sha256',secret).update('listing-change:'+data).digest();const supplied=Buffer.from(signature,'base64url');
  if(expected.length!==supplied.length || !timingSafeEqual(expected,supplied))return null;
  const claims=JSON.parse(Buffer.from(data,'base64url').toString()) as Claims;
  if(!['events','careers'].includes(claims.collection) || !/^\d+$/.test(claims.id) || typeof claims.emailHash!=='string' || !Number.isFinite(claims.expires) || (!allowExpired && claims.expires<=now))return null;
  return claims;
 }catch{return null;}
}
export function changeLink(collection:ListingCollection,doc:Listing,secret:string,now=Date.now()){
 const origin=process.env.VERCEL_ENV==='production'?'https://www.masca.org.au':process.env.GOOGLE_AUTH_ORIGIN || 'https://www.masca.org.au';
 return `${origin}/submission/change#token=${createChangeToken(collection,doc,secret,now)}`;
}
export async function changeListing(payload:Payload,token:string,allowExpired=false){
 const claims=verifyChangeToken(token,payload.secret,Date.now(),allowExpired);
 if(!claims)throw new ChangeLinkError('This private link is invalid or has expired.');
 const doc=await payload.findByID({collection:claims.collection,id:claims.id,draft:true,depth:0,overrideAccess:true}).catch(()=>null);
 if(!doc || !doc.submissionReceivedAt || contactHash(doc as unknown as Listing)!==claims.emailHash)throw new ChangeLinkError('This private link is no longer valid.');
 return {claims,doc};
}
export async function submitChangeRequest(payload:Payload,token:string,message:string){
 if(message.trim().length<10 || message.trim().length>4000)throw Error('Describe your changes in 10–4,000 characters.');
 const {claims,doc}=await changeListing(payload,token);
 const openKey=`${claims.collection}:${claims.id}`;
 const findOpen=async()=>(await payload.find({collection:'listing-change-requests',where:{openKey:{equals:openKey}},limit:1,depth:0,overrideAccess:true})).docs[0];
 const existing=await findOpen();if(existing)return existing;
 try{return await payload.create({collection:'listing-change-requests',overrideAccess:true,data:{openKey,listingCollection:claims.collection,listingID:claims.id,title:doc.title,message:message.trim(),status:'open'}});}
 catch(error){const concurrent=await findOpen();if(concurrent)return concurrent;throw error;}
}
