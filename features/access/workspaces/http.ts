import {APIError,getPayload} from 'payload';import config from '@payload-config';
import type {CommitteeAccount} from '../committeePolicy';
export const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export function fail(e:unknown){return reply({error:e instanceof APIError?e.message:'Access could not be loaded or saved. Try again.'},e instanceof APIError?e.status:500)}
export async function actor(request:Request){if(process.env.WORKSPACE_AUTH_ENABLED!=='true')throw new APIError('Workspace sign-in is not enabled.',403);const payload=await getPayload({config});const {user}=await payload.auth({headers:request.headers});if(!user)throw new APIError('Sign in to manage access.',401);return user as unknown as CommitteeAccount}
