import config from '@payload-config';
import {getPayload} from 'payload';
import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {consumeSubmissionAttempt} from '@/features/events/submissionRateLimit';
import {ChangeLinkError,changeListing,changeLink,submitChangeRequest,verifyChangeToken} from '@/features/submissions/listingChanges';
import {buildListingEmail,sendOnce} from '@/features/submissions/listingEmail';
import {storeFor,deliver} from '@/features/submissions/listingEmailActions';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({message:'Open the private link from your email.'},403);
 const text=await request.text();if(text.length>8000)return json({message:'Request is too long.'},413);
 let body;try{body=JSON.parse(text);}catch{return json({message:'Invalid request.'},400);}
 if(typeof body?.token!=='string' || body.token.length>1024)return json({message:'Invalid private link.'},400);
 if(!['inspect','submit','renew'].includes(body.action))return json({message:'Unknown action.'},400);
 const payload=await getPayload({config});
 try{
  if(body.action==='renew'){
   const {claims,doc}=await changeListing(payload,body.token,true);
   // A valid signed (possibly expired) link is required. One renewal email per listing per day.
   const email=buildListingEmail(claims.collection,{...doc},'change-link',{changeURL:changeLink(claims.collection,{...doc},payload.secret)});
   await sendOnce(storeFor(payload,claims.collection,doc.id,'change-link'),deliver,`change-link-${claims.collection}-${doc.id}-${Math.floor(Date.now()/86400000)}`,email,'Submitter link renewal');
   return json({ok:true,message:'A fresh private link has been sent to the submitter’s email address.'});
  }
  if(!verifyChangeToken(body.token,payload.secret)){
   const validExpired=Boolean(verifyChangeToken(body.token,payload.secret,Date.now(),true));
   return json({message:validExpired?'This private link has expired. Request a fresh link below.':'This private link is invalid.',expired:validExpired},410);
  }
  if(body.action==='inspect'){
   const {claims,doc}=await changeListing(payload,body.token);
   const requests=await payload.find({collection:'listing-change-requests',where:{openKey:{equals:`${claims.collection}:${claims.id}`}},limit:1,depth:0,overrideAccess:true});
   const open=requests.docs[0];
   return json({title:doc.title,open:open?{message:open.message,createdAt:open.createdAt}:null});
  }
  if(typeof body.message!=='string' || body.message.trim().length<10 || body.message.trim().length>4000)return json({message:'Describe your changes in 10–4,000 characters.'},422);
  const key=createHash('sha256').update(body.token).digest('hex');
  if(!consumeSubmissionAttempt(`change:${key}`))return json({message:'Too many attempts. Please try again in an hour.'},429);
  await submitChangeRequest(payload,body.token,body.message);
  return json({ok:true,message:'Your change request has been received. MASCA will review it before updating your listing.'},201);
 }catch(error){payload.logger.warn('Submission change request could not be completed.');return json({message:error instanceof ChangeLinkError?error.message:'We could not complete this request. Please check your details or try again later.'},400);}
}
