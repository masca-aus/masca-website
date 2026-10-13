import {APIError} from 'payload';
import {actor,reply,fail} from '@/features/access/workspaces/http';
import {accessSnapshot} from '@/features/access/workspaces/graph';
import {mutateAccess} from '@/features/access/workspaces/mutations';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{return reply(await accessSnapshot(await actor(request)))}catch(e){return fail(e)}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new APIError('Open this action inside the CMS.',403);
 const body=await request.text();if(body.length>20000)throw new APIError('Access request is too large.',413);
 let value;try{value=JSON.parse(body)}catch{throw new APIError('Invalid access request.',400)}
 return reply(await mutateAccess(await actor(request),value));
 }catch(e){return fail(e)}}
