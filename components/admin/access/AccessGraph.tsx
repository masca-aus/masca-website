'use client';
import {useState} from 'react';
import {ArrowLeft,LayoutGrid,Table2} from 'lucide-react';
import type {AccessGraphSnapshot} from '@/features/access/workspaces/types';
import {useAccessGraph} from './useAccessGraph';import {WorkspaceBubble} from './WorkspaceBubble';import {AreaBubble} from './AreaBubble';import {PeopleTray} from './PeopleTray';import {AccessTable} from './AccessTable';
import './accessGraph.css';import '../mediaCalendar/calendar.css';
export function AccessGraph({initialSnapshot}:{initialSnapshot?:AccessGraphSnapshot}){
 const {snapshot,loading,error,retry}=useAccessGraph(initialSnapshot),[workspaceId,setWorkspaceId]=useState<string|null>(null),[selectedPerson,setPerson]=useState<string|null>(null),[view,setView]=useState<'bubbles'|'table'>('bubbles'),[archived,setArchived]=useState(false);
 return <main className="access-graph"><header className="ag-page-heading"><div><h1>People & access</h1><p>Choose a workspace to see who can use each tool.</p></div><div className="ag-view-toggle"><button type="button" aria-label="Bubble view" aria-pressed={view==='bubbles'} onClick={()=>setView('bubbles')}><LayoutGrid size={17}/></button><button type="button" aria-label="Table view" aria-pressed={view==='table'} onClick={()=>setView('table')}><Table2 size={17}/></button></div></header>
 {loading&&<div className="ag-skeleton" role="status" aria-label="Loading access"><div/><div/><div/></div>}
 {error&&<div className="ag-error" role="alert"><p>{error}</p><button type="button" className="ag-secondary" onClick={retry}>Try again</button></div>}
 {snapshot&&!loading&&<>{snapshot.mode==='staged'&&<p className="ag-staged">Workspace access is staged. Memberships shown here will take effect after the rollout review; current legacy access remains in use.</p>}
 <section className="ag-boundary"><header className="ag-boundary-heading"><img src="/logo/logo.webp" alt="MASCA" width="32" height="32"/><div><h2>CMS administration</h2><p>Platform management is separate from content access.</p></div>{snapshot.workspaces.some(w=>w.status==='archived')&&<button type="button" className="ag-text" onClick={()=>setArchived(v=>!v)}>{archived?'Hide archived':'Show archived'}</button>}</header>
 {workspaceId&&<button type="button" className="ag-text ag-back" onClick={()=>setWorkspaceId(null)}><ArrowLeft size={15}/>All workspaces</button>}
 {view==='table'?<AccessTable snapshot={snapshot}/>:<div className="ag-workspaces">{snapshot.workspaces.filter(w=>archived||w.status==='active').map(w=>{const members=snapshot.memberships.filter(m=>m.committee===w.id);return <WorkspaceBubble key={w.id} workspace={w} expanded={workspaceId===w.id} connected={members.some(m=>m.userId===selectedPerson)} count={members.length} onOpen={()=>setWorkspaceId(workspaceId===w.id?null:w.id)}><div className="ag-areas">{w.areas.map(a=><AreaBubble key={a} area={a} members={members} people={snapshot.people} selectedPerson={selectedPerson} onPerson={setPerson}/>)}</div>{!w.areas.length&&<p>No tools enabled yet. Enabling a tool assigns no access.</p>}</WorkspaceBubble>})}{!snapshot.workspaces.length&&<p>No workspaces yet</p>}</div>}
 <PeopleTray people={snapshot.people} selected={selectedPerson} onSelect={setPerson}/>
 </section></>}
 </main>;
}
