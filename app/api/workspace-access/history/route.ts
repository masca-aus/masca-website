import {actor,reply,fail} from '@/features/access/workspaces/http';
import {accessHistory} from '@/features/access/workspaces/history';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const p=new URL(request.url).searchParams;return reply({history:await accessHistory(await actor(request),p.get('workspace')??'',p.get('person')??undefined)})}catch(e){return fail(e)}}
