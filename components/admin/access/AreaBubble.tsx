'use client';
import {Plus} from 'lucide-react';
import type {CommitteeArea} from '@/features/access/committeePolicy';
import type {AccessPerson,GraphMembership} from '@/features/access/workspaces/types';
import {memberAreaLabels} from '@/features/access/memberPresentation';
import {PersonAvatar} from './PeopleTray';
export function AreaBubble({area,members,people,selectedPerson,onPerson,onAdd,children}:{area:CommitteeArea;members:GraphMembership[];people:AccessPerson[];selectedPerson:string|null;onPerson:(id:string)=>void;onAdd?:()=>void;children?:React.ReactNode}){
 const assigned=members.filter(m=>m.roles[area]?.length);
 return <section className={`ag-area ${assigned.some(m=>m.userId===selectedPerson)?'is-connected':''}`} data-motion-key={`area-${area}`} aria-label={`${memberAreaLabels[area]} access`}>
 <header><h3>{memberAreaLabels[area]}</h3>{onAdd&&<button type="button" className="ag-icon" aria-label={`Add person to ${memberAreaLabels[area]}`} onClick={onAdd}><Plus size={17}/></button>}</header>
 {children??<><p className="ag-count">{assigned.length} {assigned.length===1?'member':'members'}</p><div className="ag-area-people">{assigned.slice(0,8).map(m=>{const p=people.find(p=>p.id===m.userId);return p&&<button type="button" key={p.id} className="ag-area-person" onClick={()=>onPerson(p.id)} aria-label={`View ${p.name} in ${memberAreaLabels[area]}`}><PersonAvatar person={p}/><span>{p.name}<small>{m.roles[area]?.map(r=>r[0].toUpperCase()+r.slice(1)).join(' · ')}</small>{Date.parse(m.expiresAt)<=Date.now()&&<small>Expired</small>}{p.status==='suspended'&&<small>Suspended</small>}</span></button>})}</div>{assigned.length>8&&<button type="button" className="ag-text" onClick={()=>onPerson(assigned[8].userId)}>View all {assigned.length} members</button>}{!assigned.length&&<span className="ag-empty">No access assigned</span>}</>}
 </section>;
}
