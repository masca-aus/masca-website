// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const state=vi.hoisted(()=>({modified:false,hasSavePermission:true}));
vi.mock('@payloadcms/ui',()=>({useDocumentInfo:()=>({id:7,hasSavePermission:state.hasSavePermission,data:{updatedAt:'today'},hasPublishedDoc:true}),useFormModified:()=>state.modified}));
import {ListingEmailControl} from '../components/admin/ListingEmailControl';
beforeEach(()=>{state.modified=false;state.hasSavePermission=true;HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('offers preview for a live listing without sending on render',async()=>{
 const requests:{method:string;body?:string}[]=[];
 vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(_url.endsWith('/change-requests'))return {ok:true,json:async()=>({requests:[]})};requests.push({method:init?.method||'GET',body:init?.body as string});return {ok:true,json:async()=>init?{to:'organiser@example.com',subject:'Your event is live',html:'<p>Published</p>',version:'v1',lastSent:null}:{origin:'external',problem:null,lastSent:null,receipt:{sentAt:'2026-10-01'}}};});
 render(<ListingEmailControl collection="events"/>);
 const button=await screen.findByRole('button',{name:'Send approval email'});
 await waitFor(()=>expect(button.hasAttribute('disabled')).toBe(false));
 expect(requests).toEqual([{method:'GET',body:undefined}]);
 fireEvent.click(button);
 expect(await screen.findByText('organiser@example.com')).toBeTruthy();
 expect(requests[1].body).toBe('{"action":"preview"}');
 expect(screen.getByRole('button',{name:'Send email'})).toBeTruthy();
});
it('blocks email actions while edits are unsaved',async()=>{
 state.modified=true;vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>({origin:'external',problem:null,lastSent:null,receipt:null})}));
 render(<ListingEmailControl collection="careers"/>);
 expect((await screen.findByRole('button',{name:'Send approval email'})).hasAttribute('disabled')).toBe(true);
 expect(screen.getByText('Save your changes before previewing an email.')).toBeTruthy();
});
it('hides sending controls for read-only editors',()=>{
 state.hasSavePermission=false;render(<ListingEmailControl collection="events"/>);
 expect(screen.queryByRole('button')).toBeNull();
});

it('shows an internal label and no email button for a staff-created listing',async()=>{
 vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>({origin:'internal',problem:null,lastSent:null,receipt:null})}));
 render(<ListingEmailControl collection="events"/>);
 expect(await screen.findByText('Internal listing')).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Send approval email'})).toBeNull();
});
