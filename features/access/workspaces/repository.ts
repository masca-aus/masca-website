import type pg from 'pg';
import {committeeAreas,committeeScopes} from '../committeePolicy.ts';
import {accessPool,workspaceTable} from '../delegatedAccess.ts';
import type {AccessWorkspace,WorkspaceInput} from './types.ts';
export function legacyWorkspaces():AccessWorkspace[]{return committeeScopes.map(id=>({id,name:id,kind:'committee',status:'active',areas:[...committeeAreas],termEnd:null,sponsorId:null,revision:'seed'}))}
export function validateWorkspace(value:unknown):WorkspaceInput{
 if(!value||typeof value!=='object')throw Error('Enter workspace details.');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['name','kind','areas','termEnd','sponsorId'].includes(k)))throw Error('Unknown workspace field.');
 if(typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>80)throw Error('Name must be 1–80 characters.');
 if(v.kind!=='committee'&&v.kind!=='project')throw Error('Choose a committee or project.');
 if(!Array.isArray(v.areas)||v.areas.length>committeeAreas.length||new Set(v.areas).size!==v.areas.length||v.areas.some(a=>!committeeAreas.includes(a)))throw Error('Choose implemented tools.');
 if(v.termEnd!=null&&(typeof v.termEnd!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(v.termEnd)||!Number.isFinite(Date.parse(v.termEnd))))throw Error('Choose a valid term end.');
 if(v.sponsorId!=null&&(typeof v.sponsorId!=='string'||v.sponsorId.length>100||!v.sponsorId))throw Error('Invalid sponsor.');
 return {name:v.name.trim(),kind:v.kind,areas:v.areas,termEnd:(v.termEnd as string)??null,sponsorId:(v.sponsorId as string)??null};
}
export async function loadWorkspaceCatalog(client?:pg.PoolClient):Promise<AccessWorkspace[]>{
 const {rows}=await (client??accessPool()).query(`SELECT id,name,kind,status,areas,term_end,sponsor_id,revision FROM ${workspaceTable('access_workspaces')} ORDER BY created_at,id${client?" FOR SHARE":""}`);
 return rows.map(r=>({id:r.id,name:r.name,kind:r.kind,status:r.status,areas:r.areas,termEnd:r.term_end?.toISOString()??null,sponsorId:r.sponsor_id,revision:r.revision}));
}
